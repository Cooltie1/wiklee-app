"use client";

import { FormEvent, useState } from "react";

import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

import { type UserRole } from "@/lib/roles";

const ROLE_OPTIONS: Array<{ id: UserRole; label: string }> = [
  { id: "admin", label: "Admin" },
  { id: "agent", label: "Agent" },
  { id: "user", label: "User" },
];

function isUserRole(value: string): value is UserRole {
  return value === "admin" || value === "agent" || value === "user";
}

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
          <div id="role">
            <LookupDropdown
              items={ROLE_OPTIONS}
              selectedId={role}
              onSelect={(selectedRole) => {
                if (selectedRole && isUserRole(selectedRole)) {
                  setRole(selectedRole);
                }
              }}
              getItemLabel={(roleOption) => roleOption.label}
              placeholder="Select role"
              searchable={false}
              emptyText="No roles found"
            />
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
