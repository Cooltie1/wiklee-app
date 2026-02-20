"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OnboardingPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If they already have an org, skip onboarding
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", userData.user.id)
        .single();

      if (profileErr) {
        setError(profileErr.message);
        setChecking(false);
        return;
      }

      if (profile?.org_id) {
        router.replace("/app");
        return;
      }

      setChecking(false);
    })();
  }, [router]);

  async function createOrgAndAttach() {
    setLoading(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const name = companyName.trim();
    if (!name) {
      setLoading(false);
      setError("Please enter a company name.");
      return;
    }

    // 1) Create org
    const { data: org, error: orgErr } = await supabase
      .from("orgs")
      .insert({ name })
      .select("id")
      .single();

    if (orgErr || !org) {
      setLoading(false);
      setError(orgErr?.message ?? "Failed to create org.");
      return;
    }

    // 2) Attach user profile to org
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ org_id: org.id })
      .eq("id", user.id);

    setLoading(false);

    if (profErr) {
      setError(profErr.message);
      return;
    }

    router.replace("/app");
  }

  if (checking) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your company</CardTitle>
          <CardDescription>This sets up your Wiklee workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="company">Company name</Label>
            <Input
              id="company"
              placeholder="Acme Inc"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={createOrgAndAttach} disabled={loading}>
            {loading ? "Creating..." : "Create workspace"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}