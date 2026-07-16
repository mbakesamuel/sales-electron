import { ipcMain } from "electron";
import type {
  PermissionMatrix,
  SavePermissionMatrixInput,
} from "../../shared/permissions.types.js";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.js";
import { getSession } from "../auth/session.js";
import {
  getPermissionMatrix,
  loadRolePermissionsSnapshot,
  savePermissionMatrix,
} from "../auth/permissions/service.js";

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
}
