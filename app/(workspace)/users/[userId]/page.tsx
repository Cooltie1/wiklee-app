"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AvatarUploader } from "@/components/AvatarUploader";
import { UserAvatar } from "@/components/UserAvatar";
import { LookupDropdown } from "@/components/lookup/LookupDropdown";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { useFieldAutosave } from "@/lib/useFieldAutosave";
import { getUserDisplayName } from "@/lib/userDisplayName";
import { normalizeRole, type UserRole } from "@/lib/roles";

type UserProfile = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_path: string | null;
  role: UserRole | null;
};

const ROLE_OPTIONS: Array<{ id: UserRole; label: string }> = [
  { id: "admin", label: "Admin" },
  { id: "agent", label: "Agent" },
  { id: "user", label: "User" },
];

function getDisplayName(profile: Pick<UserProfile, "display_name" | "first_name" | "last_name">) {
  return getUserDisplayName(profile);
}

function UserDetailContent({
  profile,
  canEditProfile,
  canEditRole,
}: {
  profile: UserProfile;
  canEditProfile: boolean;
  canEditRole: boolean;
}) {
  const [avatarPath, setAvatarPath] = useState(profile.avatar_path);

  const firstNameAutosave = useFieldAutosave<string>({
    initialValue: profile.first_name ?? "",
    onSave: async (nextValue) => {
      if (!canEditProfile) {
        throw new Error("You do not have permission to update this profile.");
      }

      const { error } = await supabase.from("profiles").update({ first_name: nextValue.trim() || null }).eq("id", profile.id);
      if (error) throw new Error(error.message);
    },
  });

  const lastNameAutosave = useFieldAutosave<string>({
    initialValue: profile.last_name ?? "",
    onSave: async (nextValue) => {
      if (!canEditProfile) {
        throw new Error("You do not have permission to update this profile.");
      }

      const { error } = await supabase.from("profiles").update({ last_name: nextValue.trim() || null }).eq("id", profile.id);
      if (error) throw new Error(error.message);
    },
  });

  const displayNameAutosave = useFieldAutosave<string>({
    initialValue: profile.display_name ?? "",
    onSave: async (nextValue) => {
      if (!canEditProfile) {
        throw new Error("You do not have permission to update this profile.");
      }

      const { error } = await supabase.from("profiles").update({ display_name: nextValue.trim() || null }).eq("id", profile.id);
      if (error) throw new Error(error.message);
    },
  });

  const roleAutosave = useFieldAutosave<UserRole>({
    initialValue: profile.role ?? "user",
    onSave: async (nextValue) => {
      if (!canEditRole) {
        throw new Error("You do not have permission to update this user role.");
      }

      const { error } = await supabase.from("profiles").update({ role: nextValue }).eq("id", profile.id);
      if (error) throw new Error(error.message);
    },
  });

  const isAnySaving = [firstNameAutosave.status, lastNameAutosave.status, displayNameAutosave.status, roleAutosave.status].includes("saving");
  const isAnySaved = [firstNameAutosave.status, lastNameAutosave.status, displayNameAutosave.status, roleAutosave.status].includes("saved");
  const autosaveError =
    firstNameAutosave.errorMessage || lastNameAutosave.errorMessage || displayNameAutosave.errorMessage || roleAutosave.errorMessage;

  const sidebarStatus = useMemo(() => {
    if (isAnySaving) return "Saving...";
    if (autosaveError) return "Unable to save changes";
    if (isAnySaved) return "Saved";
    return "";
  }, [autosaveError, isAnySaved, isAnySaving]);

  const displayName = useMemo(
    () =>
      getDisplayName({
        display_name: displayNameAutosave.currentValue,
        first_name: firstNameAutosave.currentValue,
        last_name: lastNameAutosave.currentValue,
      }),
    [displayNameAutosave.currentValue, firstNameAutosave.currentValue, lastNameAutosave.currentValue]
  );

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_1fr] overflow-hidden bg-white">
      <aside className="h-full border-r border-zinc-200 bg-white p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              value={firstNameAutosave.currentValue}
              onChange={(event) => firstNameAutosave.setValue(event.target.value)}
              disabled={!canEditProfile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              value={lastNameAutosave.currentValue}
              onChange={(event) => lastNameAutosave.setValue(event.target.value)}
              disabled={!canEditProfile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayNameAutosave.currentValue}
              onChange={(event) => displayNameAutosave.setValue(event.target.value)}
              disabled={!canEditProfile}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primary-email">Primary email</Label>
            <Input id="primary-email" type="email" value={profile.email ?? ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <div id="role">
              <LookupDropdown
                items={ROLE_OPTIONS}
                selectedId={roleAutosave.currentValue}
                onSelect={(selectedRole) => {
                  if (selectedRole === "admin" || selectedRole === "agent" || selectedRole === "user") {
                    roleAutosave.setValue(selectedRole);
                  }
                }}
                getItemLabel={(roleOption) => roleOption.label}
                placeholder="Select role"
                searchable={false}
                emptyText="No roles found"
                disabled={!canEditRole}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-1 text-xs">
          {sidebarStatus ? <p className="text-zinc-500">{sidebarStatus}</p> : null}
          {autosaveError ? <p className="text-red-600">{autosaveError}</p> : null}
          {!canEditProfile ? <p className="text-zinc-500">This profile is read-only for your role.</p> : null}
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
              <li className="text-zinc-900">{displayName}</li>
            </ol>
          </nav>

          <div className="mt-4 flex items-center gap-3">
            {canEditProfile ? (
              <AvatarUploader
                userId={profile.id}
                name={displayName}
                avatarPath={avatarPath}
                sizeClassName="size-12"
                tooltipText="Update avatar"
                onAvatarUpdated={setAvatarPath}
              />
            ) : (
              <UserAvatar userId={profile.id} name={displayName} avatarPath={avatarPath} className="size-12" />
            )}
            <h1 className="text-2xl font-semibold text-zinc-900">{displayName}</h1>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-6" />
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setLoadError("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const currentUser = authData.user;

      if (!isMounted) {
        return;
      }

      if (authError || !currentUser) {
        setProfile(null);
        setLoadError("Unable to load user details.");
        setIsLoading(false);
        return;
      }

      setCurrentUserId(currentUser.id);

      const { data: currentUserProfile, error: currentUserProfileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (!isMounted) {
        return;
      }

      if (currentUserProfileError) {
        setProfile(null);
        setLoadError("Unable to load user details.");
        setIsLoading(false);
        return;
      }

      setCurrentUserRole(normalizeRole(currentUserProfile?.role));

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, email, avatar_path, role")
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

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading user details...</p>;
  }

  if (loadError || !profile) {
    return <p className="text-sm text-red-600">{loadError || "User not found."}</p>;
  }

  const isOwnProfile = currentUserId === profile.id;
  const canEditRole = currentUserRole === "admin";
  const canEditProfile = isOwnProfile || currentUserRole === "admin";

  return <UserDetailContent profile={profile} canEditProfile={canEditProfile} canEditRole={canEditRole} />;
}
