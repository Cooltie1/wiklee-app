"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  updated_at: string | null;
};

type FilterOption = "everyone" | "agents" | "users";

function getDisplayName(profile: Pick<ProfileRow, "first_name" | "last_name">) {
  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return fullName || "Unknown User";
}

function getDisplayRole(role: string | null) {
  if (!role) {
    return "User";
  }

  return role.toLowerCase() === "agent" ? "Agent" : "User";
}

function getRelativeUpdated(updatedAt: string | null) {
  if (!updatedAt) {
    return "—";
  }

  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const diffMs = Date.now() - date.getTime();

  if (diffMs < 60_000) {
    return "Just now";
  }

  if (diffMs < 3_600_000) {
    const minutes = Math.floor(diffMs / 60_000);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < 86_400_000) {
    const hours = Math.floor(diffMs / 3_600_000);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffMs < 604_800_000) {
    const days = Math.floor(diffMs / 86_400_000);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("everyone");

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles() {
      setLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const authUser = authData.user;

      if (!isMounted) {
        return;
      }

      if (authError || !authUser) {
        setProfiles([]);
        setError("Unable to load users.");
        setLoading(false);
        return;
      }

      const { data: currentProfile, error: currentProfileError } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", authUser.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (currentProfileError || !currentProfile?.org_id) {
        setProfiles([]);
        setError("Unable to load users.");
        setLoading(false);
        return;
      }

      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role, updated_at")
        .eq("org_id", currentProfile.org_id)
        .order("first_name", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (profilesError) {
        setProfiles([]);
        setError("Unable to load users.");
        setLoading(false);
        return;
      }

      setProfiles((profileRows ?? []) as ProfileRow[]);
      setLoading(false);
    }

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProfiles = useMemo(() => {
    if (selectedFilter === "everyone") {
      return profiles;
    }

    return profiles.filter((profile) => {
      const isAgent = profile.role?.toLowerCase() === "agent";
      return selectedFilter === "agents" ? isAgent : !isAgent;
    });
  }, [profiles, selectedFilter]);

  const filterButtonClassName = (isSelected: boolean) =>
    `rounded-full border shadow-xs ${
      isSelected
        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
    }`;

  return (
    <section className="grid h-full grid-rows-[auto_1fr] gap-4 overflow-hidden">
      <div className="space-y-3">
        <div>
          <h2 className="text-4xl font-bold">Users</h2>
          <p className="text-sm text-zinc-500">Manage users and agents in one place.</p>
        </div>

        <div className="flex items-center gap-2" role="radiogroup" aria-label="Filter users by role">
          <Button
            type="button"
            onClick={() => setSelectedFilter("everyone")}
            variant="outline"
            className={filterButtonClassName(selectedFilter === "everyone")}
            role="radio"
            aria-checked={selectedFilter === "everyone"}
          >
            Everyone
          </Button>
          <Button
            type="button"
            onClick={() => setSelectedFilter("agents")}
            variant="outline"
            className={filterButtonClassName(selectedFilter === "agents")}
            role="radio"
            aria-checked={selectedFilter === "agents"}
          >
            Agents
          </Button>
          <Button
            type="button"
            onClick={() => setSelectedFilter("users")}
            variant="outline"
            className={filterButtonClassName(selectedFilter === "users")}
            role="radio"
            aria-checked={selectedFilter === "users"}
          >
            Users
          </Button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-zinc-200 p-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading users...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : filteredProfiles.length === 0 ? (
          <p className="text-sm text-zinc-500">No users found for the selected filter.</p>
        ) : (
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-3">Name</th>
                <th className="py-3">Role</th>
                <th className="py-3">Email</th>
                <th className="py-3">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="border-b border-zinc-100 last:border-b-0">
                  <td className="py-4 font-medium">{getDisplayName(profile)}</td>
                  <td className="py-4">{getDisplayRole(profile.role)}</td>
                  <td className="py-4">{profile.email ?? "—"}</td>
                  <td className="py-4">{getRelativeUpdated(profile.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
