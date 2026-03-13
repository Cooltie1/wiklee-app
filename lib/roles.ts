export type UserRole = "admin" | "agent" | "user";

export function normalizeRole(role: string | null | undefined): UserRole | null {
  const normalized = role?.toLowerCase();

  if (normalized === "admin" || normalized === "agent" || normalized === "user") {
    return normalized;
  }

  return null;
}

export function isAgentLikeRole(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "agent" || normalizedRole === "admin";
}

export function getRoleLabel(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "admin") return "Admin";
  if (normalizedRole === "agent") return "Agent";

  return "User";
}
