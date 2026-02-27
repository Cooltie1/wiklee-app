import type { SupabaseClient } from "@supabase/supabase-js"

type AvatarSignedUrlCacheEntry = {
  url: string
  expiresAt: number
}

const avatarSignedUrlCache = new Map<string, AvatarSignedUrlCacheEntry>()
const EXPIRY_BUFFER_MS = 60_000

export async function getAvatarSignedUrl(
  supabase: SupabaseClient,
  avatarPath: string,
  expiresInSeconds = 3600
) {
  const normalizedPath = avatarPath.trim()

  if (!normalizedPath) {
    return null
  }

  const now = Date.now()
  const cached = avatarSignedUrlCache.get(normalizedPath)

  if (cached && cached.expiresAt - EXPIRY_BUFFER_MS > now) {
    return cached.url
  }

  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(normalizedPath, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create avatar signed URL")
  }

  avatarSignedUrlCache.set(normalizedPath, {
    url: data.signedUrl,
    expiresAt: now + expiresInSeconds * 1000,
  })

  return data.signedUrl
}
