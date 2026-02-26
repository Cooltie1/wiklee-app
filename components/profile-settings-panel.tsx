"use client";

import { useEffect, useState } from "react";

import { AvatarUploader } from "@/components/AvatarUploader";
import { UserAvatar } from "@/components/UserAvatar";
import { supabase } from "@/lib/supabaseClient";

type ProfileState = {
  id: string;
  name: string;
  avatarPath: string | null;
};

export function ProfileSettingsPanel() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

      const name = `${profileData.first_name ?? ""} ${profileData.last_name ?? ""}`.trim() || user.email || "User";

      setProfile({
        id: user.id,
        name,
        avatarPath: profileData.avatar_path ?? null,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>;
  }

  if (error || !profile) {
    return <p className="text-sm text-destructive">{error ?? "Unable to load profile."}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar
          userId={profile.id}
          name={profile.name}
          avatarPath={profile.avatarPath}
          className="h-14 w-14"
          refreshKey={avatarRefreshKey}
        />
        <div>
          <p className="font-medium">{profile.name}</p>
          <p className="text-sm text-muted-foreground">Manage your profile image.</p>
        </div>
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
