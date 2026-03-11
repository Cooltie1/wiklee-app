"use client";

import { useEffect, useMemo, useState } from "react";

import { AvatarUploader } from "@/components/AvatarUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

type ProfileState = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  hasCustomizedDisplayName: boolean;
  avatarPath: string | null;
};

function getFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function getDisplayName(profile: ProfileState) {
  return profile.displayName || profile.email || "User";
}

export function ProfileSettingsPanel() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (userError || !user) {
        setError(userError?.message ?? "Unable to load user profile.");
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, avatar_path")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const firstName = profileData.first_name ?? "";
      const lastName = profileData.last_name ?? "";
      const fullName = getFullName(firstName, lastName);
      const displayName = profileData.display_name ?? fullName;
      const hasCustomizedDisplayName = !!displayName.trim() && displayName.trim() !== fullName;

      setProfile({
        id: user.id,
        email: user.email ?? "",
        firstName,
        lastName,
        displayName,
        hasCustomizedDisplayName,
        avatarPath: profileData.avatar_path ?? null,
      });
      setLoading(false);
    })();
  }, []);

  const displayName = useMemo(() => (profile ? getDisplayName(profile) : "User"), [profile]);

  async function saveProfileDetails() {
    if (!profile) {
      return;
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    const trimmedFirstName = profile.firstName.trim();
    const trimmedLastName = profile.lastName.trim();
    const trimmedDisplayName = profile.displayName.trim();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        display_name: trimmedDisplayName || null,
      })
      .eq("id", profile.id);

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    setProfile((prev) =>
      prev
        ? {
            ...prev,
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
            displayName: trimmedDisplayName,
          }
        : prev,
    );
    setSaveMessage("Profile updated.");
    setSaving(false);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>;
  }

  if (error || !profile) {
    return <p className="text-sm text-destructive">{error ?? "Unable to load profile."}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <AvatarUploader
          userId={profile.id}
          name={displayName}
          avatarPath={profile.avatarPath}
          sizeClassName="h-24 w-24"
          onAvatarUpdated={(nextAvatarPath) => {
            setProfile((prev) => (prev ? { ...prev, avatarPath: nextAvatarPath } : prev));
          }}
        />
        <div>
          <p className="font-medium">{displayName}</p>
          <p className="text-sm text-muted-foreground">Manage your profile image and name.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:max-w-md">
        <div className="grid gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={profile.firstName}
            onChange={(event) => {
              const nextFirstName = event.target.value;
              const fullName = getFullName(nextFirstName, profile.lastName);

              setProfile((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  firstName: nextFirstName,
                  displayName: prev.hasCustomizedDisplayName ? prev.displayName : fullName,
                };
              });
              setSaveMessage(null);
            }}
            disabled={saving}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={profile.lastName}
            onChange={(event) => {
              const nextLastName = event.target.value;
              const fullName = getFullName(profile.firstName, nextLastName);

              setProfile((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  lastName: nextLastName,
                  displayName: prev.hasCustomizedDisplayName ? prev.displayName : fullName,
                };
              });
              setSaveMessage(null);
            }}
            disabled={saving}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={profile.displayName}
            onChange={(event) => {
              const nextDisplayName = event.target.value;
              const fullName = getFullName(profile.firstName, profile.lastName);

              setProfile((prev) => {
                if (!prev) return prev;

                return {
                  ...prev,
                  displayName: nextDisplayName,
                  hasCustomizedDisplayName:
                    prev.hasCustomizedDisplayName || nextDisplayName.trim() !== fullName,
                };
              });
              setSaveMessage(null);
            }}
            disabled={saving}
          />
        </div>

        <Button onClick={saveProfileDetails} disabled={saving} className="w-fit">
          {saving ? "Saving..." : "Save profile"}
        </Button>

        {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
      </div>
    </div>
  );
}
