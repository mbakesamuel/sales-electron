export const USER_ROLES = [
  "ADMIN",
  "MANAGER",
  "SENIOR_SALES_SUPERVISOR",
  "STATISTICS_SUPERVISOR",
  "SALES_CLERK",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type RouteAccess = "none" | "read" | "write";

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  SENIOR_SALES_SUPERVISOR: "Senior sales supervisor",
  STATISTICS_SUPERVISOR: "Statistics supervisor",
  SALES_CLERK: "Sales clerk",
};

export function formatRoleLabel(role: string): string {
  if (role in ROLE_LABELS) {
    return ROLE_LABELS[role as UserRole];
  }

  return role.replace(/_/g, " ").toLowerCase();
}

export function normalizeUserRole(role: string): UserRole | null {
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : null;
}
