"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? null);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("profile fetch error:", error.message);
        router.replace("/login");
        return;
      }

      if (!profile?.org_id) {
        router.replace("/onboarding");
      }
    })();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="p-8 space-y-4">
      <div className="text-xl font-semibold">Welcome{email ? `, ${email}` : ""}</div>
      <Button variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
