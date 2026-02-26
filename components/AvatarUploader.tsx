"use client";

import { ChangeEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invalidateAvatarUrlCache } from "@/lib/avatarUrlCache";
import { supabase } from "@/lib/supabaseClient";

type AvatarUploaderProps = {
  userId: string;
  avatarPath?: string | null;
  onAvatarUpdated?: (nextAvatarPath: string) => void;
};

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) {
    return fromName;
  }

  const mimeExtension = file.type.split("/")[1]?.toLowerCase();
  return mimeExtension || "png";
}

export function AvatarUploader({ userId, avatarPath, onAvatarUpdated }: AvatarUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFileName = useMemo(() => file?.name ?? "", [file]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const selected = event.target.files?.[0];

    if (!selected) {
      setFile(null);
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setFile(null);
      setError("Please choose an image file.");
      return;
    }

    setFile(selected);
  }

  async function uploadAvatar() {
    if (!file) {
      setError("Please choose an image before uploading.");
      return;
    }

    setError(null);
    setIsUploading(true);

    const extension = getFileExtension(file);
    const nextAvatarPath = `users/${userId}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(nextAvatarPath, file, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_path: nextAvatarPath })
      .eq("id", userId);

    if (profileError) {
      setError(profileError.message);
      setIsUploading(false);
      return;
    }

    invalidateAvatarUrlCache(avatarPath);
    invalidateAvatarUrlCache(nextAvatarPath);
    onAvatarUpdated?.(nextAvatarPath);
    setFile(null);
    setIsUploading(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:max-w-sm">
        <Input type="file" accept="image/*" onChange={onFileChange} disabled={isUploading} />
        {selectedFileName ? <p className="text-xs text-muted-foreground">Selected: {selectedFileName}</p> : null}
      </div>

      <Button onClick={uploadAvatar} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload avatar"}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
