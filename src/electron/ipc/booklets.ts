import { ipcMain } from "electron";
import { getSession } from "../auth/session.js";
import {
  cancelDocumentBooklet,
  createDocumentBooklet,
  listDocumentBooklets,
  rejectDocumentBooklet,
  validateDocumentBooklet,
  validateManyBooklets,
  validateSerialForSalesPoint,
} from "../booklets/service.js";
import { canWriteRoute } from "../auth/permissions/service.js";
import type {
  CreateDocumentBookletInput,
  DocumentBookletFilters,
  ValidateSerialForSalesPointInput,
} from "../../shared/documentBooklets.types.js";

export function registerBookletsHandlers(): void {
  ipcMain.handle(
    "booklets:listBooklets",
    (_event, token: string, filters?: DocumentBookletFilters) => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return [];
      }
      return listDocumentBooklets(filters);
    },
  );

  ipcMain.handle(
    "booklets:createBooklet",
    (_event, token: string, input: CreateDocumentBookletInput) => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return { ok: false, error: "Login required." };
      }
      if (!canWriteRoute(user.role, "document-booklets")) {
        return {
          ok: false,
          error: "You do not have permission to issue document booklets.",
        };
      }
      return createDocumentBooklet(user, input);
    },
  );

  ipcMain.handle(
    "booklets:validateBooklet",
    (_event, token: string, bookletId: string) => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return { ok: false, error: "Login required." };
      }
      return validateDocumentBooklet(user, bookletId);
    },
  );

  ipcMain.handle(
    "booklets:rejectBooklet",
    (_event, token: string, bookletId: string, reason?: string) => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return { ok: false, error: "Login required." };
      }
      return rejectDocumentBooklet(user, bookletId, reason);
    },
  );

  ipcMain.handle(
    "booklets:validateManyBooklets",
    (_event, token: string, bookletIds: string[]) => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return {
          ok: false,
          validated: 0,
          errors: [],
          error: "Login required.",
        };
      }
      return validateManyBooklets(user, bookletIds);
    },
  );

  ipcMain.handle(
    "booklets:cancelBooklet",
    (_event, token: string, bookletId: string, reason?: string) => {
      const user = getSession(typeof token === "string" ? token : "");
      if (!user) {
        return { ok: false, error: "Login required." };
      }
      if (!canWriteRoute(user.role, "document-booklets")) {
        return {
          ok: false,
          error: "You do not have permission to cancel document booklets.",
        };
      }
      return cancelDocumentBooklet(user, bookletId, reason);
    },
  );

  ipcMain.handle(
    "booklets:validateSerial",
    (_event, input: ValidateSerialForSalesPointInput) => {
      return validateSerialForSalesPoint(input);
    },
  );
}
