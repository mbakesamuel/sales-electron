import type {
  PermissionActionKey,
  PermissionMatrix,
  RolePermissionsSnapshot,
} from "../../../shared/permissions.types.js";
import { PERMISSION_ACTIONS } from "../../../shared/permissions.types.js";
import { ROUTE_DEFINITIONS, ROUTE_IDS } from "../../../shared/routeCatalog.js";
import {
  normalizeUserRole,
  ROLE_LABELS,
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
  validate_delivery_orders: "Validate delivery orders",
  cancel_validated_delivery_order: "Cancel validated delivery orders",
  manage_permissions: "Manage role permissions",
  draft_stock_receipts: "Draft stock receipts",
  post_stock_receipts: "Post stock receipts",
  draft_stock_transfers: "Draft stock transfers",
  post_stock_transfers: "Post / dispatch / receive stock transfers",
  draft_stock_adjustments: "Draft stock adjustments",
  post_stock_adjustments: "Post stock adjustments",
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

export function loadRolePermissionsSnapshot(role: string): RolePermissionsSnapshot {
  const normalizedRole = normalizeUserRole(role);
  const routes = Object.fromEntries(ROUTE_IDS.map((routeId) => [routeId, "none"])) as Record<
    string,
    RouteAccess
  >;
  const actions = emptyActionAccess();

  if (!normalizedRole) {
    return { routes, actions };
  }

  const db = getDatabase();
  const routeRows = db
    .prepare(
      `SELECT routeId, access
       FROM RoleRoutePermission
       WHERE role = ?`,
    )
    .all(normalizedRole) as Array<{ routeId: string; access: string }>;

  for (const row of routeRows) {
    routes[row.routeId] = normalizeRouteAccess(row.access);
  }

  const actionRows = db
    .prepare(
      `SELECT actionKey, allowed
       FROM RoleActionPermission
       WHERE role = ?`,
    )
    .all(normalizedRole) as Array<{ actionKey: string; allowed: number }>;

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
  if (table === "RoleRoutePermission" || table === "RoleActionPermission") {
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
  const routeAccess = Object.fromEntries(
    USER_ROLES.map((role) => [role, Object.fromEntries(ROUTE_IDS.map((routeId) => [routeId, "none"]))]),
  ) as Record<string, Record<string, RouteAccess>>;

  const actionAccess = Object.fromEntries(
    USER_ROLES.map((role) => [role, emptyActionAccess()]),
  ) as Record<string, Record<PermissionActionKey, boolean>>;

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
    roles: [...USER_ROLES],
    roleLabels: ROLE_LABELS,
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
    for (const userRole of USER_ROLES) {
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
}
