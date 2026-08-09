import type { RouteAccess } from "./roles.ts";

export const PERMISSION_ACTIONS = [
  "validate_sales",
  "validate_delivery_orders",
  "cancel_validated_delivery_order",
  "manage_permissions",
  "draft_stock_receipts",
  "post_stock_receipts",
  "draft_stock_transfers",
  "post_stock_transfers",
  "draft_stock_adjustments",
  "post_stock_adjustments",
] as const;

export type PermissionActionKey = (typeof PERMISSION_ACTIONS)[number];

export interface RolePermissionsSnapshot {
  routes: Record<string, RouteAccess>;
  actions: Record<PermissionActionKey, boolean>;
}

export interface PermissionMatrixRow {
  routeId: string;
  label: string;
  sectionId: string;
}

export interface PermissionMatrix {
  roles: string[];
  roleLabels: Record<string, string>;
  routes: PermissionMatrixRow[];
  routeAccess: Record<string, Record<string, RouteAccess>>;
  actions: Array<{ key: PermissionActionKey; label: string }>;
  actionAccess: Record<string, Record<PermissionActionKey, boolean>>;
}

export interface SavePermissionMatrixInput {
  authToken: string;
  routeAccess: Record<string, Record<string, RouteAccess>>;
  actionAccess: Record<string, Record<PermissionActionKey, boolean>>;
}

export interface AuthSessionResponse {
  user: import("./database.types.js").AuthUser;
  permissions: RolePermissionsSnapshot;
}

export interface PermissionsApi {
  getSnapshot(token: string): Promise<RolePermissionsSnapshot | null>;
  getMatrix(token: string): Promise<PermissionMatrix | { error: string }>;
  saveMatrix(input: SavePermissionMatrixInput): Promise<{ ok: true } | { error: string }>;
}
