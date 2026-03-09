"use client";

import { FormEvent, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

type UserRole = "agent" | "user";

export default function NewUserPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setIsSaving(false);
      setErrorMessage("You must be signed in to invite users.");
      return;
    }

    const response = await fetch("/api/users/invite", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, role }),
    });

    const result = (await response.json().catch(() => ({}))) as { error?: string };

    setIsSaving(false);

    if (!response.ok) {
      setErrorMessage(result.error ?? "Unable to send invite.");
      return;
    }

    setSuccessMessage("Invite sent successfully.");
    setEmail("");
    setRole("user");
  };

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6">
      <h2 className="text-3xl font-bold">Invite User</h2>
      <p className="mt-2 text-sm text-zinc-500">Invite a new teammate to your workspace.</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <div className="relative">
            <select
              id="role"
              name="role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="dark:bg-input/30 border-input h-9 w-full appearance-none rounded-md border bg-transparent px-3 py-1 pr-8 text-base shadow-xs outline-none transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              required
            >
              <option value="agent">Agent</option>
              <option value="user">User</option>
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2" />
          </div>
        </div>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        {successMessage ? <p className="text-sm text-green-600">{successMessage}</p> : null}

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Sending Invite..." : "Send Invite"}
        </Button>
      </form>
    </section>
  );
}
