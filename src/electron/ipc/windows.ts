import { ipcMain } from "electron";
import { requireAuthUser } from "../auth/requireUser.js";
import {
  getPendingReportBootstrap,
  openOrFocusReportWindow,
  REPORT_WINDOW_ROUTE_IDS,
  type ReportWindowBootstrap,
} from "../windows/reportWindow.js";

export function registerWindowsHandlers(): void {
  ipcMain.handle(
    "windows:openReport",
    async (
      _event,
      authToken: string,
      reportId: unknown,
      query?: unknown,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      requireAuthUser(authToken);
      if (typeof reportId !== "string" || !reportId.trim()) {
        return { ok: false, error: "Invalid report id." };
      }
      const id = reportId.trim();
      if (!REPORT_WINDOW_ROUTE_IDS.has(id)) {
        return { ok: false, error: `Report window is not enabled for "${id}".` };
      }
      return openOrFocusReportWindow(id, authToken, query);
    },
  );

  ipcMain.handle(
    "report-window:getBootstrap",
    (
      _event,
      reportId: unknown,
    ): ReportWindowBootstrap | null => {
      if (typeof reportId !== "string" || !reportId.trim()) {
        return null;
      }
      return getPendingReportBootstrap(reportId.trim());
    },
  );
}
