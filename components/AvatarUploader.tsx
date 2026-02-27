"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSignedAvatarUrl, invalidateAvatarUrlCache } from "@/lib/avatarUrlCache";
import { supabase } from "@/lib/supabaseClient";

type AvatarUploaderProps = {
  userId: string;
  name?: string | null;
  avatarPath?: string | null;
  sizeClassName?: string;
  tooltipText?: string;
  onAvatarUpdated?: (nextAvatarPath: string) => void;
};

export const AVATAR_UPDATED_EVENT = "profile-avatar-updated";

type AvatarUpdatedEventDetail = {
  userId: string;
  avatarPath: string;
};

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) {
    return fromName;
  }

  const mimeExtension = file.type.split("/")[1]?.toLowerCase();
  return mimeExtension || "png";
}

function getInitials(name?: string | null) {
  const normalized = name?.trim();

  if (!normalized) {
    return "?";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");

  return initials.join("") || "?";
}

export function AvatarUploader({
  userId,
  name,
  avatarPath,
  sizeClassName = "h-24 w-24",
  tooltipText = "Upload profile picture",
  onAvatarUpdated,
}: AvatarUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const fallback = useMemo(() => getInitials(name), [name]);
  const displaySrc = localPreviewUrl ?? signedUrl;

  useEffect(() => {
    let isMounted = true;

    if (!avatarPath?.trim()) {
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      try {
        const url = await getSignedAvatarUrl(supabase, avatarPath, 3600, true);
        if (isMounted) {
          setSignedUrl(url);
        }
      } catch (loadError) {
        console.error("Failed to load avatar signed URL", loadError);
        if (isMounted) {
          setSignedUrl(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [avatarPath]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  async function uploadAvatar(file: File) {
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

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<AvatarUpdatedEventDetail>(AVATAR_UPDATED_EVENT, {
          detail: {
            userId,
            avatarPath: nextAvatarPath,
          },
        }),
      );
    }

    onAvatarUpdated?.(nextAvatarPath);
    setIsUploading(false);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setError(null);

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(selected);
    setLocalPreviewUrl(nextPreviewUrl);
    setSignedUrl(nextPreviewUrl);
    void uploadAvatar(selected);
  }

  return (
    <div className="space-y-2">
      <div className="group relative inline-flex">
        <button
          type="button"
          className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title={tooltipText}
          aria-label={tooltipText}
        >
          <Avatar className={sizeClassName}>
            {displaySrc ? <AvatarImage src={displaySrc} alt={`${name ?? "User"} avatar`} /> : null}
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Pencil className="h-5 w-5" />
          </span>
          {isUploading ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-xs font-medium text-white">
              Uploading...
            </span>
          ) : null}
        </button>

        <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {tooltipText}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onFileChange}
        disabled={isUploading}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
