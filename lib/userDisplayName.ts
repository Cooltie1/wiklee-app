type NameParts = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export function getUserDisplayName(user: NameParts, fallback = "Unknown User") {
  const displayName = user.display_name?.trim();
  if (displayName) return displayName;

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return fullName || fallback;
}
