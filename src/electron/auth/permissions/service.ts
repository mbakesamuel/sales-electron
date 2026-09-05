import type {
  PermissionActionKey,
  PermissionMatrix,
  RolePermissionsSnapshot,
} from "../../../shared/permissions.types.js";
import { PERMISSION_ACTIONS } from "../../../shared/permissions.types.js";
import { ROUTE_DEFINITIONS, ROUTE_IDS } from "../../../shared/routeCatalog.js";
import {
  SYSTEM_USER_ROLES,
  USER_ROLES,
  type RouteAccess,
} from "../../../shared/roles.js";
import { getDatabase } from "../../db/index.js";
import {
  getDefaultActionMatrix,
  getDefaultRouteMatrix,
} from "./defaults.js";

const ACTION_LABELS: Record<PermissionActionKey, string> = {
  validate_sales: "Validate sales invoices",
  direct_validate_sales:
    "Validate sales invoices directly (skip pending review)",
  validate_delivery_orders: "Validate delivery orders",
  cancel_validated_delivery_order: "Cancel validated delivery orders",
  transfer_delivery_order_balance: "Transfer delivery order balance",
  validate_vehicle_consignment_notes: "Validate vehicle consignment notes",
  manage_permissions: "Manage role permissions",
  draft_stock_receipts: "Draft stock receipts",
  post_stock_receipts: "Post stock receipts",
  draft_stock_transfers: "Draft stock transfers",
  post_stock_transfers: "Post / dispatch stock transfers",
  receive_stock_transfers: "Receive incoming stock transfers",
  draft_stock_adjustments: "Draft stock adjustments",
  post_stock_adjustments: "Post stock adjustments",
  direct_post_stock_receipts: "Post stock receipts directly (skip draft review)",
  direct_post_stock_transfers: "Post stock transfers directly (skip draft review)",
  validate_stock_documents: "Validate pending stock documents (receipts, transfers, adjustments)",
  validate_document_booklets: "Validate document booklet issuances",
};

function emptyActionAccess(): Record<PermissionActionKey, boolean> {
  return Object.fromEntries(PERMISSION_ACTIONS.map((key) => [key, false])) as Record<
    PermissionActionKey,
    boolean
  >;
}

function normalizeRouteAccess(value: string): RouteAccess {
  const normalized = value.toUpperCase();
  if (normalized === "READ") {
    return "read";
  }
  if (normalized === "WRITE") {
    return "write";
  }
  return "none";
}

function toDbRouteAccess(access: RouteAccess): string {
  return access.toUpperCase();
}

function loadRoleCatalog(): Array<{ id: string; label: string; isSystem: boolean }> {
  try {
    const rows = getDatabase()
      .prepare(
        `SELECT id, label, isSystem
         FROM Role
         ORDER BY sortOrder ASC, label ASC`,
      )
      .all() as Array<{ id: string; label: string; isSystem: number }>;
    if (rows.length > 0) {
      return rows.map((row) => ({
        id: row.id,
        label: row.label,
        isSystem: row.isSystem === 1,
      }));
    }
  } catch {
    // Role table may not exist yet during early migration.
  }
  return SYSTEM_USER_ROLES.map((id) => ({
    id,
    label: id,
    isSystem: true,
  }));
}

function listKnownRoleIds(): string[] {
  return loadRoleCatalog().map((role) => role.id);
}

export function loadRolePermissionsSnapshot(role: string): RolePermissionsSnapshot {
  const routes = Object.fromEntries(ROUTE_IDS.map((routeId) => [routeId, "none"])) as Record<
    string,
    RouteAccess
  >;
  const actions = emptyActionAccess();

  if (!role?.trim()) {
    return { routes, actions };
  }

  const db = getDatabase();
  const routeRows = db
    .prepare(
      `SELECT routeId, access
       FROM RoleRoutePermission
       WHERE role = ?`,
    )
    .all(role) as Array<{ routeId: string; access: string }>;

  for (const row of routeRows) {
    routes[row.routeId] = normalizeRouteAccess(row.access);
  }

  const actionRows = db
    .prepare(
      `SELECT actionKey, allowed
       FROM RoleActionPermission
       WHERE role = ?`,
    )
    .all(role) as Array<{ actionKey: string; allowed: number }>;

  for (const row of actionRows) {
    if (row.actionKey in actions) {
      actions[row.actionKey as PermissionActionKey] = row.allowed === 1;
    }
  }

  return { routes, actions };
}

export function getRouteAccess(role: string, routeId: string): RouteAccess {
  return loadRolePermissionsSnapshot(role).routes[routeId] ?? "none";
}

export function canAccessRoute(role: string, routeId: string): boolean {
  return getRouteAccess(role, routeId) !== "none";
}

export function canWriteRoute(role: string, routeId: string): boolean {
  return getRouteAccess(role, routeId) === "write";
}

export function canPerformAction(role: string, actionKey: PermissionActionKey): boolean {
  return loadRolePermissionsSnapshot(role).actions[actionKey] ?? false;
}

export function getUserRoleById(userId: string): string | null {
  const row = getDatabase()
    .prepare(`SELECT role FROM User WHERE id = ?`)
    .get(userId) as { role: string } | undefined;

  return row?.role ?? null;
}

/** True when the user must submit carry-forward data for supervisor validation (statistics clerk path). */
export function carryForwardRequiresValidation(userId: string): boolean {
  const role = getUserRoleById(userId);
  if (!role) {
    return true;
  }
  if (canPerformAction(role, "validate_stock_documents")) {
    return false;
  }
  if (canPerformAction(role, "validate_delivery_orders")) {
    return false;
  }
  return true;
}

export function assertRouteWrite(role: string, routeId: string): void {
  if (!canWriteRoute(role, routeId)) {
    throw new Error("You do not have permission to modify this module.");
  }
}

export function assertRouteRead(role: string, routeId: string): void {
  if (!canAccessRoute(role, routeId)) {
    throw new Error("You do not have permission to view this module.");
  }
}

export function assertTableWrite(role: string, table: string): void {
  if (table === "RoleRoutePermission" || table === "RoleActionPermission" || table === "Role") {
    if (!canPerformAction(role, "manage_permissions")) {
      throw new Error("You do not have permission to manage role permissions.");
    }
    return;
  }

  const routeId = ROUTE_DEFINITIONS.find((route) => route.table === table)?.id;
  if (!routeId) {
    if (role !== "ADMIN") {
      throw new Error(`You do not have permission to modify "${table}".`);
    }
    return;
  }

  assertRouteWrite(role, routeId);
}

export function assertAction(role: string, actionKey: PermissionActionKey): void {
  if (!canPerformAction(role, actionKey)) {
    throw new Error("You do not have permission to perform this action.");
  }
}

export function getPermissionMatrix(): PermissionMatrix {
  const db = getDatabase();
  const roleDefs = loadRoleCatalog();
  const roleIds = roleDefs.map((role) => role.id);

  const routeAccess = Object.fromEntries(
    roleIds.map((role) => [role, Object.fromEntries(ROUTE_IDS.map((routeId) => [routeId, "none"]))]),
  ) as Record<string, Record<string, RouteAccess>>;

  const actionAccess = Object.fromEntries(
    roleIds.map((role) => [role, emptyActionAccess()]),
  ) as Record<string, Record<PermissionActionKey, boolean>>;

  const roleLabels = Object.fromEntries(roleDefs.map((role) => [role.id, role.label])) as Record<
    string,
    string
  >;
  const roleIsSystem = Object.fromEntries(
    roleDefs.map((role) => [role.id, role.isSystem]),
  ) as Record<string, boolean>;

  const routeRows = db
    .prepare(`SELECT role, routeId, access FROM RoleRoutePermission`)
    .all() as Array<{ role: string; routeId: string; access: string }>;

  for (const row of routeRows) {
    if (routeAccess[row.role] && row.routeId in routeAccess[row.role]) {
      routeAccess[row.role][row.routeId] = normalizeRouteAccess(row.access);
    }
  }

  const actionRows = db
    .prepare(`SELECT role, actionKey, allowed FROM RoleActionPermission`)
    .all() as Array<{ role: string; actionKey: string; allowed: number }>;

  for (const row of actionRows) {
    if (actionAccess[row.role] && row.actionKey in actionAccess[row.role]) {
      actionAccess[row.role][row.actionKey as PermissionActionKey] = row.allowed === 1;
    }
  }

  return {
    roles: roleIds,
    roleLabels,
    roleIsSystem,
    routes: ROUTE_DEFINITIONS.map((route) => ({
      routeId: route.id,
      label: route.label,
      sectionId: route.sectionId,
    })),
    routeAccess,
    actions: (Object.keys(ACTION_LABELS) as PermissionActionKey[]).map((key) => ({
      key,
      label: ACTION_LABELS[key],
    })),
    actionAccess,
  };
}

export function savePermissionMatrix(
  role: string,
  routeAccess: Record<string, Record<string, RouteAccess>>,
  actionAccess: Record<string, Record<PermissionActionKey, boolean>>,
): void {
  assertAction(role, "manage_permissions");

  const db = getDatabase();
  const roleIds = listKnownRoleIds();
  const insertRoute = db.prepare(`
    INSERT INTO RoleRoutePermission (role, routeId, access)
    VALUES (?, ?, ?)
    ON CONFLICT(role, routeId) DO UPDATE SET access = excluded.access
  `);
  const insertAction = db.prepare(`
    INSERT INTO RoleActionPermission (role, actionKey, allowed)
    VALUES (?, ?, ?)
    ON CONFLICT(role, actionKey) DO UPDATE SET allowed = excluded.allowed
  `);

  const tx = db.transaction(() => {
    for (const userRole of roleIds) {
      for (const routeId of ROUTE_IDS) {
        const access = routeAccess[userRole]?.[routeId] ?? "none";
        insertRoute.run(userRole, routeId, toDbRouteAccess(access));
      }

      for (const actionKey of PERMISSION_ACTIONS) {
        const allowed = actionAccess[userRole]?.[actionKey] ? 1 : 0;
        insertAction.run(userRole, actionKey, allowed);
      }
    }
  });

  tx();
}

export function seedDefaultPermissions(database: import("better-sqlite3").Database): void {
  const routeMatrix = getDefaultRouteMatrix();
  const actionMatrix = getDefaultActionMatrix();

  const insertRoute = database.prepare(`
    INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
    VALUES (?, ?, ?)
  `);
  const insertAction = database.prepare(`
    INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
    VALUES (?, ?, ?)
  `);

  for (const role of USER_ROLES) {
    for (const routeId of ROUTE_IDS) {
      insertRoute.run(role, routeId, toDbRouteAccess(routeMatrix[role][routeId] ?? "none"));
    }

    for (const [actionKey, allowed] of Object.entries(actionMatrix[role])) {
      insertAction.run(role, actionKey, allowed ? 1 : 0);
    }
  }

  // Custom roles: ensure every catalog route exists (default NONE) so new gates appear in the UI.
  // Role table is created in migration 062; skip when seeding from earlier migrations (e.g. 012).
  const roleTable = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Role' LIMIT 1`,
    )
    .get();
  if (!roleTable) {
    return;
  }

  const customRoles = database
    .prepare(`SELECT id FROM Role WHERE isSystem = 0`)
    .all() as Array<{ id: string }>;
  for (const { id: roleId } of customRoles) {
    for (const routeId of ROUTE_IDS) {
      insertRoute.run(roleId, routeId, "NONE");
    }
    for (const actionKey of PERMISSION_ACTIONS) {
      insertAction.run(roleId, actionKey, 0);
    }
  }
}
