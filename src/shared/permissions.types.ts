import type { RouteAccess } from "./roles.ts";

export const PERMISSION_ACTIONS = [
  "validate_sales",
  "direct_validate_sales",
  "validate_delivery_orders",
  "cancel_validated_delivery_order",
  "transfer_delivery_order_balance",
  "validate_vehicle_consignment_notes",
  "manage_permissions",
  "draft_stock_receipts",
  "post_stock_receipts",
  "draft_stock_transfers",
  "post_stock_transfers",
  "receive_stock_transfers",
  "draft_stock_adjustments",
  "post_stock_adjustments",
  "direct_post_stock_receipts",
  "direct_post_stock_transfers",
  "validate_stock_documents",
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
  /** True when the role is a built-in system role (cannot be deleted). */
  roleIsSystem: Record<string, boolean>;
  routes: PermissionMatrixRow[];
  routeAccess: Record<string, Record<string, RouteAccess>>;
  actions: Array<{ key: PermissionActionKey; label: string }>;
  actionAccess: Record<string, Record<PermissionActionKey, boolean>>;
}

export interface RoleDefinition {
  id: string;
  label: string;
  isSystem: boolean;
  sortOrder: number;
  userCount: number;
}

export type RoleMutationResult = { ok: true; role: RoleDefinition } | { ok: false; error: string };
export type RoleDeleteResult = { ok: true } | { ok: false; error: string };

export interface CreateRoleInput {
  authToken: string;
  label: string;
  /** Optional explicit id; otherwise derived from label. */
  id?: string | null;
  /** Copy route/action permissions from this role (default STORE_KEEPER). */
  copyFromRoleId?: string | null;
}

export interface UpdateRoleInput {
  authToken: string;
  id: string;
  label: string;
}

export interface DeleteRoleInput {
  authToken: string;
  id: string;
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
  listRoles(token: string): Promise<RoleDefinition[] | { error: string }>;
  createRole(input: CreateRoleInput): Promise<RoleMutationResult>;
  updateRole(input: UpdateRoleInput): Promise<RoleMutationResult>;
  deleteRole(input: DeleteRoleInput): Promise<RoleDeleteResult>;
}
