import { ipcMain } from "electron";
import type {
  AuthSessionResponse,
  LoginInput,
  LoginResponse,
} from "../../shared/database.types.js";
import { getAuthSession, login, logout } from "../auth/session.js";

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
}
