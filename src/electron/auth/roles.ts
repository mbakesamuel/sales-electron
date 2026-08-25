import type {
  CreateRoleInput,
  DeleteRoleInput,
  RoleDefinition,
  RoleDeleteResult,
  RoleMutationResult,
  UpdateRoleInput,
} from "../../shared/permissions.types.js";
import { PERMISSION_ACTIONS } from "../../shared/permissions.types.js";
import { ROUTE_IDS } from "../../shared/routeCatalog.js";
import {
  isSystemUserRole,
  isValidRoleId,
  roleIdFromLabel,
  SYSTEM_ROLE_LABELS,
  SYSTEM_USER_ROLES,
} from "../../shared/roles.js";
import { getDatabase } from "../db/index.js";

function actorCanManagePermissions(actorRole: string): boolean {
  if (actorRole === "ADMIN") {
    return true;
  }
  const row = getDatabase()
    .prepare(
      `SELECT allowed FROM RoleActionPermission
       WHERE role = ? AND actionKey = 'manage_permissions'`,
    )
    .get(actorRole) as { allowed: number } | undefined;
  return row?.allowed === 1;
}

function assertManageRoles(role: string): void {
  if (!actorCanManagePermissions(role)) {
    throw new Error("You do not have permission to manage roles.");
  }
}

function mapRoleRow(row: {
  id: string;
  label: string;
  isSystem: number;
  sortOrder: number;
  userCount: number;
}): RoleDefinition {
  return {
    id: row.id,
    label: row.label,
    isSystem: row.isSystem === 1,
    sortOrder: row.sortOrder,
    userCount: row.userCount,
  };
}

const LIST_ROLES_SQL = `
  SELECT r.id, r.label, r.isSystem, r.sortOrder,
         (SELECT COUNT(*) FROM User u WHERE u.role = r.id) AS userCount
  FROM Role r
  ORDER BY r.sortOrder ASC, r.label ASC
`;

export function listRoles(): RoleDefinition[] {
  const db = getDatabase();
  const rows = db.prepare(LIST_ROLES_SQL).all() as Array<{
    id: string;
    label: string;
    isSystem: number;
    sortOrder: number;
    userCount: number;
  }>;
  return rows.map(mapRoleRow);
}

function nextSortOrder(db: import("better-sqlite3").Database): number {
  const row = db
    .prepare(`SELECT COALESCE(MAX(sortOrder), 0) AS maxSort FROM Role`)
    .get() as { maxSort: number };
  return row.maxSort + 10;
}

function seedEmptyPermissions(
  db: import("better-sqlite3").Database,
  roleId: string,
): void {
  const insertRoute = db.prepare(`
    INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
    VALUES (?, ?, 'NONE')
  `);
  const insertAction = db.prepare(`
    INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
    VALUES (?, ?, 0)
  `);
  for (const routeId of ROUTE_IDS) {
    insertRoute.run(roleId, routeId);
  }
  for (const actionKey of PERMISSION_ACTIONS) {
    insertAction.run(roleId, actionKey);
  }
}

function copyPermissions(
  db: import("better-sqlite3").Database,
  fromRoleId: string,
  toRoleId: string,
): void {
  db.prepare(
    `INSERT OR REPLACE INTO RoleRoutePermission (role, routeId, access)
     SELECT ?, routeId, access FROM RoleRoutePermission WHERE role = ?`,
  ).run(toRoleId, fromRoleId);
  db.prepare(
    `INSERT OR REPLACE INTO RoleActionPermission (role, actionKey, allowed)
     SELECT ?, actionKey, allowed FROM RoleActionPermission WHERE role = ?`,
  ).run(toRoleId, fromRoleId);
}

export function createRole(
  actorRole: string,
  input: Omit<CreateRoleInput, "authToken">,
): RoleMutationResult {
  try {
    assertManageRoles(actorRole);
    const label = String(input.label ?? "").trim();
    if (!label) {
      return { ok: false, error: "Role name is required." };
    }

    const rawId = String(input.id ?? "").trim().toUpperCase() || roleIdFromLabel(label);
    if (!isValidRoleId(rawId)) {
      return {
        ok: false,
        error: "Role id must start with a letter and use only A–Z, 0–9, and underscores.",
      };
    }
    if (isSystemUserRole(rawId)) {
      return { ok: false, error: "That role id is reserved for a system role." };
    }

    const db = getDatabase();
    const existing = db.prepare(`SELECT id FROM Role WHERE id = ?`).get(rawId);
    if (existing) {
      return { ok: false, error: `Role "${rawId}" already exists.` };
    }

    const copyFrom = String(input.copyFromRoleId ?? "").trim() || "STORE_KEEPER";
    const copyExists = db.prepare(`SELECT id FROM Role WHERE id = ?`).get(copyFrom);
    if (!copyExists) {
      return { ok: false, error: `Copy-from role "${copyFrom}" was not found.` };
    }

    const sortOrder = nextSortOrder(db);
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO Role (id, label, isSystem, sortOrder, createdAt, updatedAt)
         VALUES (?, ?, 0, ?, datetime('now'), datetime('now'))`,
      ).run(rawId, label, sortOrder);
      seedEmptyPermissions(db, rawId);
      copyPermissions(db, copyFrom, rawId);
      db.prepare(
        `UPDATE RoleActionPermission
         SET allowed = 0
         WHERE role = ? AND actionKey = 'manage_permissions'`,
      ).run(rawId);
    });
    tx();

    const created = listRoles().find((r) => r.id === rawId);
    if (!created) {
      return { ok: false, error: "Role was created but could not be reloaded." };
    }
    return { ok: true, role: created };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create role.",
    };
  }
}

export function updateRole(
  actorRole: string,
  input: Omit<UpdateRoleInput, "authToken">,
): RoleMutationResult {
  try {
    assertManageRoles(actorRole);
    const id = String(input.id ?? "").trim();
    const label = String(input.label ?? "").trim();
    if (!id) {
      return { ok: false, error: "Role id is required." };
    }
    if (!label) {
      return { ok: false, error: "Role name is required." };
    }

    const db = getDatabase();
    const existing = db.prepare(`SELECT id FROM Role WHERE id = ?`).get(id);
    if (!existing) {
      return { ok: false, error: "Role not found." };
    }

    db.prepare(
      `UPDATE Role SET label = ?, updatedAt = datetime('now') WHERE id = ?`,
    ).run(label, id);

    const updated = listRoles().find((r) => r.id === id);
    if (!updated) {
      return { ok: false, error: "Role was updated but could not be reloaded." };
    }
    return { ok: true, role: updated };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update role.",
    };
  }
}

export function deleteRole(
  actorRole: string,
  input: Omit<DeleteRoleInput, "authToken">,
): RoleDeleteResult {
  try {
    assertManageRoles(actorRole);
    const id = String(input.id ?? "").trim();
    if (!id) {
      return { ok: false, error: "Role id is required." };
    }

    const db = getDatabase();
    const existing = db
      .prepare(`SELECT id, isSystem FROM Role WHERE id = ?`)
      .get(id) as { id: string; isSystem: number } | undefined;
    if (!existing) {
      return { ok: false, error: "Role not found." };
    }
    if (existing.isSystem === 1 || isSystemUserRole(id)) {
      return { ok: false, error: "System roles cannot be deleted." };
    }

    const users = db
      .prepare(`SELECT COUNT(*) AS count FROM User WHERE role = ?`)
      .get(id) as { count: number };
    if (users.count > 0) {
      return {
        ok: false,
        error: `Cannot delete role while ${users.count} user(s) are assigned. Reassign them first.`,
      };
    }

    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM RoleRoutePermission WHERE role = ?`).run(id);
      db.prepare(`DELETE FROM RoleActionPermission WHERE role = ?`).run(id);
      db.prepare(`DELETE FROM Role WHERE id = ?`).run(id);
    });
    tx();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to delete role.",
    };
  }
}

/** Ensure Role rows exist for built-in roles (used by migration + seed). */
export function seedSystemRoles(database: import("better-sqlite3").Database): void {
  const insert = database.prepare(`
    INSERT OR IGNORE INTO Role (id, label, isSystem, sortOrder, createdAt, updatedAt)
    VALUES (?, ?, 1, ?, datetime('now'), datetime('now'))
  `);
  SYSTEM_USER_ROLES.forEach((role, index) => {
    insert.run(role, SYSTEM_ROLE_LABELS[role], (index + 1) * 10);
  });
}
