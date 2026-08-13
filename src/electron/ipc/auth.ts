import { ipcMain } from "electron";
import type {
  AuthSessionResponse,
  ChangePasswordInput,
  ChangePasswordResponse,
  LoginInput,
  LoginResponse,
} from "../../shared/database.types.js";
import {
  changePassword,
  getAuthSession,
  login,
  logout,
} from "../auth/session.js";

export function registerAuthHandlers(): void {
  ipcMain.handle(
    "auth:login",
    (_event, data: LoginInput): LoginResponse => {
      const username =
        typeof data?.username === "string" ? data.username : "";
      const password =
        typeof data?.password === "string" ? data.password : "";

      return login(username, password);
    },
  );

  ipcMain.handle(
    "auth:getSession",
    (_event, token: string): AuthSessionResponse | null => {
      if (typeof token !== "string") {
        return null;
      }

      return getAuthSession(token);
    },
  );

  ipcMain.handle("auth:logout", (_event, token: string): void => {
    if (typeof token !== "string") {
      return;
    }

    logout(token);
  });

  ipcMain.handle(
    "auth:changePassword",
    (_event, data: ChangePasswordInput): ChangePasswordResponse => {
      const authToken =
        typeof data?.authToken === "string" ? data.authToken : "";
      const currentPassword =
        typeof data?.currentPassword === "string" ? data.currentPassword : "";
      const newPassword =
        typeof data?.newPassword === "string" ? data.newPassword : "";

      return changePassword(authToken, currentPassword, newPassword);
    },
  );
}
