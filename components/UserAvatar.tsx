"use client";

import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSignedAvatarUrl } from "@/lib/avatarUrlCache";
import { supabase } from "@/lib/supabaseClient";

type UserAvatarProps = {
  userId: string;
  name?: string | null;
  avatarPath?: string | null;
  className?: string;
  refreshKey?: number;
};

function getInitials(name?: string | null) {
  const normalized = name?.trim();

  if (!normalized) {
    return "?";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");

  return initials.join("") || "?";
}

export function UserAvatar({ userId, name, avatarPath, className, refreshKey }: UserAvatarProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fallback = useMemo(() => getInitials(name), [name]);

  useEffect(() => {
    let isMounted = true;
    const normalizedPath = avatarPath?.trim();

    if (!normalizedPath) {
      setSignedUrl(null);
      return;
    }

    setIsLoading(true);

    (async () => {
      try {
        const url = await getSignedAvatarUrl(supabase, normalizedPath, 3600, Boolean(refreshKey));

        if (isMounted) {
          setSignedUrl(url);
        }
      } catch (error) {
        console.error("Failed to load avatar signed URL", error);
        if (isMounted) {
          setSignedUrl(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [avatarPath, refreshKey]);

  return (
    <Avatar className={className}>
      {signedUrl ? <AvatarImage src={signedUrl} alt={`${name ?? "User"} avatar`} /> : null}
      <AvatarFallback aria-label={`Avatar for ${userId}`}>{isLoading ? "..." : fallback}</AvatarFallback>
    </Avatar>
  );
}
