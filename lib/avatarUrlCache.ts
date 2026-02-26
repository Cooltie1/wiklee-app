import type { SupabaseClient } from "@supabase/supabase-js";

type AvatarUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const avatarUrlCache = new Map<string, AvatarUrlCacheEntry>();

const EXPIRY_BUFFER_MS = 60_000;

export async function getSignedAvatarUrl(
  supabase: SupabaseClient,
  avatarPath: string,
  expiresInSeconds = 3600,
  forceRefresh = false
) {
  const normalizedPath = avatarPath.trim();

  if (!normalizedPath) {
    return null;
  }

  const now = Date.now();
  const cached = avatarUrlCache.get(normalizedPath);

  if (!forceRefresh && cached && cached.expiresAt - EXPIRY_BUFFER_MS > now) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(normalizedPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to generate signed avatar URL.");
  }

  avatarUrlCache.set(normalizedPath, {
    url: data.signedUrl,
    expiresAt: now + expiresInSeconds * 1000,
  });

  return data.signedUrl;
}

export function invalidateAvatarUrlCache(avatarPath?: string | null) {
  if (!avatarPath) {
    return;
  }

  avatarUrlCache.delete(avatarPath);
}
