"use client";

import { useEffect, useMemo, useState } from "react";

import { AvatarUploader } from "@/components/AvatarUploader";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

type ProfileState = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarPath: string | null;
};

function getDisplayName(profile: ProfileState) {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  return fullName || profile.email || "User";
}

export function ProfileSettingsPanel() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

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
        .select("first_name, last_name, avatar_path")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setProfile({
        id: user.id,
        email: user.email ?? "",
        firstName: profileData.first_name ?? "",
        lastName: profileData.last_name ?? "",
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

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ first_name: trimmedFirstName, last_name: trimmedLastName })
      .eq("id", profile.id);

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    setProfile((prev) => (prev ? { ...prev, firstName: trimmedFirstName, lastName: trimmedLastName } : prev));
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
        <UserAvatar
          userId={profile.id}
          name={displayName}
          avatarPath={profile.avatarPath}
          className="h-14 w-14"
          refreshKey={avatarRefreshKey}
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
              setProfile((prev) => (prev ? { ...prev, firstName: event.target.value } : prev));
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
              setProfile((prev) => (prev ? { ...prev, lastName: event.target.value } : prev));
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

      <AvatarUploader
        userId={profile.id}
        avatarPath={profile.avatarPath}
        onAvatarUpdated={(nextAvatarPath) => {
          setProfile((prev) => (prev ? { ...prev, avatarPath: nextAvatarPath } : prev));
          setAvatarRefreshKey((value) => value + 1);
        }}
      />
    </div>
  );
}
