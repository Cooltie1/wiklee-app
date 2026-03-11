"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { UserAvatar } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_path: string | null;
};

function getFullName(profile: Pick<UserProfile, "first_name" | "last_name">) {
  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return fullName || "Unknown User";
}

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, avatar_path")
        .eq("id", userId)
        .single();

      if (!isMounted) {
        return;
      }

      if (error || !data) {
        setProfile(null);
        setLoadError("Unable to load user details.");
        setIsLoading(false);
        return;
      }

      setProfile(data as UserProfile);
      setIsLoading(false);
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const fullName = useMemo(() => {
    if (!profile) {
      return "";
    }

    return getFullName(profile);
  }, [profile]);

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading user details...</p>;
  }

  if (loadError || !profile) {
    return <p className="text-sm text-red-600">{loadError || "User not found."}</p>;
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_1fr] overflow-hidden bg-white">
      <aside className="h-full border-r border-zinc-200 bg-white p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first-name">First name</Label>
            <Input id="first-name" value={profile.first_name ?? ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input id="last-name" value={profile.last_name ?? ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary-email">Primary email</Label>
            <Input id="primary-email" type="email" value={profile.email ?? ""} readOnly />
          </div>
        </div>
      </aside>

      <div className="flex h-full min-h-0 flex-col bg-white">
        <div className="border-b border-zinc-100 px-6 pb-4 pt-4">
          <nav className="text-sm text-zinc-500" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/users" className="hover:text-zinc-900 hover:underline">
                  Users
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-zinc-900">{fullName}</li>
            </ol>
          </nav>

          <div className="mt-4 flex items-center gap-3">
            <UserAvatar userId={profile.id} name={fullName} avatarPath={profile.avatar_path} className="size-12" />
            <h1 className="text-2xl font-semibold text-zinc-900">{fullName}</h1>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-6" />
      </div>
    </div>
  );
}
