import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type InviteBody = {
  email?: string;
  role?: "agent" | "user";
};

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Server is not configured for invitations." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  const currentUser = authData.user;

  if (authError || !currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await authClient
    .from("profiles")
    .select("role, org_id")
    .eq("id", currentUser.id)
    .single();

  if (profileError || profile?.role !== "agent") {
    return NextResponse.json({ error: "Only agents can invite users." }, { status: 403 });
  }

  if (!profile.org_id) {
    return NextResponse.json({ error: "Your profile is not attached to an organization." }, { status: 400 });
  }

  let body: InviteBody;

  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role;

  if (!email || !role || !["agent", "user"].includes(role)) {
    return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;

  const emailRedirectTo = appUrl ? `${appUrl.replace(/\/$/, "")}/set-password` : undefined;

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      org_id: profile.org_id,
      invited_to_org: true,
      has_set_password: false,
    },
    emailRedirectTo,
  });

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message ?? "Unable to send invite." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
