/** Built-in roles seeded on install. Custom roles may be added from the UI. */
export const SYSTEM_USER_ROLES = [
  "ADMIN",
  "MANAGER",
  "SENIOR_SALES_SUPERVISOR",
  "STATISTICS_CLERK",
  "STORE_KEEPER",
] as const;

/** @deprecated Prefer SYSTEM_USER_ROLES; kept for defaults seeding compatibility. */
export const USER_ROLES = SYSTEM_USER_ROLES;

export type SystemUserRole = (typeof SYSTEM_USER_ROLES)[number];
/** @deprecated Use string role ids from the Role table. */
export type UserRole = SystemUserRole;

export type RouteAccess = "none" | "read" | "write";

/** Custom role id for bottled-stock / collection-point operators. */
export const STORE_KEEPER_ROLE_ID = "STORE_KEEPER";

/** Custom role id for junior sales supervisors (manageable role). */
export const JNR_SALES_SUP_ROLE_ID = "JNR_SALES_SUP";

export const SENIOR_SALES_SUPERVISOR_ROLE_ID = "SENIOR_SALES_SUPERVISOR";

export const STATISTICS_CLERK_ROLE_ID = "STATISTICS_CLERK";

export function isStoreKeeperRole(role: string): boolean {
  return role === STORE_KEEPER_ROLE_ID;
}

export function isStatisticsClerkRole(role: string): boolean {
  return role === STATISTICS_CLERK_ROLE_ID;
}

/** Roles that may draft, dispatch, and post location moves. */
export function canInitiateStockTransfers(role: string): boolean {
  return (
    role === STATISTICS_CLERK_ROLE_ID ||
    role === SENIOR_SALES_SUPERVISOR_ROLE_ID ||
    role === JNR_SALES_SUP_ROLE_ID ||
    role === "MANAGER" ||
    role === "ADMIN"
  );
}

/** Roles that may receive dispatched inter-site transfers (Bottled Stock screen only). */
export function canReceiveStockTransfers(role: string): boolean {
  return role === STORE_KEEPER_ROLE_ID || role === "ADMIN";
}

/** Company-wide transfer operators bypass collection-point scope on initiate. */
export function bypassesTransferInitiateScope(role: string): boolean {
  return (
    role === STATISTICS_CLERK_ROLE_ID || role === "MANAGER" || role === "ADMIN"
  );
}

export function isSupervisorOverviewRole(role: string): boolean {
  return (
    role === SENIOR_SALES_SUPERVISOR_ROLE_ID || role === JNR_SALES_SUP_ROLE_ID
  );
}

export const SYSTEM_ROLE_LABELS: Record<SystemUserRole, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  SENIOR_SALES_SUPERVISOR: "Senior sales supervisor",
  STATISTICS_CLERK: "Statistics clerk",
  STORE_KEEPER: "Store Keeper",
};

/** @deprecated Prefer SYSTEM_ROLE_LABELS or Role.label from the database. */
export const ROLE_LABELS = SYSTEM_ROLE_LABELS;

export function isSystemUserRole(role: string): role is SystemUserRole {
  return (SYSTEM_USER_ROLES as readonly string[]).includes(role);
}

export function formatRoleLabel(role: string, labels?: Record<string, string>): string {
  if (labels && role in labels && labels[role]?.trim()) {
    return labels[role].trim();
  }
  if (isSystemUserRole(role)) {
    return SYSTEM_ROLE_LABELS[role];
  }
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize to a system role id, or null if not a built-in role. */
export function normalizeUserRole(role: string): SystemUserRole | null {
  return isSystemUserRole(role) ? role : null;
}

/** Build a stable role id from a display label (e.g. "Store Keeper" → "STORE_KEEPER"). */
export function roleIdFromLabel(label: string): string {
  const cleaned = label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return cleaned.slice(0, 64);
}

export function isValidRoleId(id: string): boolean {
  return /^[A-Z][A-Z0-9_]{0,63}$/.test(id);
}
