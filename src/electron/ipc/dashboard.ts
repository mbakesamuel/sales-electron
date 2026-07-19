import { ipcMain } from "electron";
import type { DashboardSummary } from "../../shared/dashboard.types.js";
import { requireAuthUser } from "../auth/requireUser.js";
import { getDashboardSummary } from "../dashboard/summary.js";

export function registerDashboardHandlers(): void {
  ipcMain.handle(
    "dashboard:getSummary",
    (_event, authToken: string): DashboardSummary => {
      requireAuthUser(authToken);
      return getDashboardSummary();
    },
  );
}
