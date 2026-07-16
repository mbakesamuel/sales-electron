export declare const USER_ROLES: readonly ["ADMIN", "MANAGER", "SENIOR_SALES_SUPERVISOR", "STATISTICS_SUPERVISOR", "SALES_CLERK"];
export type UserRole = (typeof USER_ROLES)[number];
export type RouteAccess = "none" | "read" | "write";
export declare const ROLE_LABELS: Record<UserRole, string>;
export declare function formatRoleLabel(role: string): string;
export declare function normalizeUserRole(role: string): UserRole | null;
