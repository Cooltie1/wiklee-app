"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

export default function TicketsPage() {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    async function loadFirstName() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setFirstName(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      setFirstName(profile?.first_name?.trim() || null);
    }

    void loadFirstName();
  }, []);

  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div>
        <h2 className="text-4xl font-bold">Hi, {firstName ?? "User"}</h2>
      </div>
    </section>
  );
}
