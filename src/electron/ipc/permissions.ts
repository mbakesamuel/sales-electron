import { ipcMain } from "electron";
import type {
  CreateRoleInput,
  DeleteRoleInput,
  PermissionMatrix,
  RoleDefinition,
  RoleDeleteResult,
  RoleMutationResult,
  SavePermissionMatrixInput,
  UpdateRoleInput,
} from "../../shared/permissions.types.js";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.js";
import { getSession } from "../auth/session.js";
import {
  getPermissionMatrix,
  loadRolePermissionsSnapshot,
  savePermissionMatrix,
  canAccessRoute,
  canPerformAction,
} from "../auth/permissions/service.js";
import {
  createRole,
  deleteRole,
  listRoles,
  updateRole,
} from "../auth/roles.js";

export function registerPermissionsHandlers(): void {
  ipcMain.handle(
    "permissions:getSnapshot",
    (_event, token: string): RolePermissionsSnapshot | null => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return null;
      }

      return loadRolePermissionsSnapshot(user.role);
    },
  );

  ipcMain.handle(
    "permissions:getMatrix",
    (_event, token: string): PermissionMatrix | { error: string } => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return { error: "Login required." };
      }

      if (!loadRolePermissionsSnapshot(user.role).actions.manage_permissions) {
        return { error: "You do not have permission to manage role permissions." };
      }

      return getPermissionMatrix();
    },
  );

  ipcMain.handle(
    "permissions:saveMatrix",
    (_event, input: SavePermissionMatrixInput): { ok: true } | { error: string } => {
      const user = getSession(input?.authToken ?? "");
      if (!user) {
        return { error: "Login required." };
      }

      try {
        savePermissionMatrix(user.role, input.routeAccess, input.actionAccess);
        return { ok: true };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Failed to save permissions.",
        };
      }
    },
  );

  ipcMain.handle(
    "permissions:listRoles",
    (_event, token: string): RoleDefinition[] | { error: string } => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return { error: "Login required." };
      }

      if (
        !canAccessRoute(user.role, "users") &&
        !canAccessRoute(user.role, "roles") &&
        !canAccessRoute(user.role, "role-permissions") &&
        !canPerformAction(user.role, "manage_permissions")
      ) {
        return { error: "You do not have permission to view roles." };
      }

      return listRoles();
    },
  );

  ipcMain.handle(
    "permissions:createRole",
    (_event, input: CreateRoleInput): RoleMutationResult => {
      const user = getSession(input?.authToken ?? "");
      if (!user) {
        return { ok: false, error: "Login required." };
      }
      return createRole(user.role, input);
    },
  );

  ipcMain.handle(
    "permissions:updateRole",
    (_event, input: UpdateRoleInput): RoleMutationResult => {
      const user = getSession(input?.authToken ?? "");
      if (!user) {
        return { ok: false, error: "Login required." };
      }
      return updateRole(user.role, input);
    },
  );

  ipcMain.handle(
    "permissions:deleteRole",
    (_event, input: DeleteRoleInput): RoleDeleteResult => {
      const user = getSession(input?.authToken ?? "");
      if (!user) {
        return { ok: false, error: "Login required." };
      }
      return deleteRole(user.role, input);
    },
  );
}
