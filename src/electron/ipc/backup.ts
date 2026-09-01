import { app, BrowserWindow, dialog, ipcMain } from "electron";
import type {
  BackupChooseFolderResult,
  BackupCreateResult,
  BackupInfo,
  BackupRestoreResult,
  BackupRunScheduledResult,
  BackupScheduleConfig,
  BackupScheduleStatus,
  BackupScheduleUpdateResult,
} from "../../shared/backup.types.js";
import {
  assertRouteRead,
  assertRouteWrite,
} from "../auth/permissions/service.js";
import { requireAuthUser } from "../auth/requireUser.js";
import {
  createBackup,
  defaultBackupFileName,
  getBackupInfo,
  restoreBackup,
} from "../db/backup.js";
import {
  getScheduleStatus,
  runScheduledBackup,
  updateScheduleConfig,
} from "../db/backupSchedule.js";

const ROUTE_ID = "data-backup";

export function registerBackupHandlers(): void {
  ipcMain.handle(
    "backup:getInfo",
    (_event, authToken: string): BackupInfo => {
      const user = requireAuthUser(authToken);
      assertRouteRead(user.role, ROUTE_ID);
      return getBackupInfo();
    },
  );

  ipcMain.handle(
    "backup:create",
    async (event, authToken: string): Promise<BackupCreateResult> => {
      const user = requireAuthUser(authToken);
      assertRouteWrite(user.role, ROUTE_ID);

      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || win.isDestroyed()) {
        return { ok: false, error: "No window available for backup." };
      }

      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Save database backup",
        defaultPath: defaultBackupFileName(),
        filters: [{ name: "SQLite database", extensions: ["db"] }],
      });

      if (canceled || !filePath) {
        return { ok: false, cancelled: true };
      }

      try {
        const result = createBackup(filePath);
        return { ok: true, filePath: result.filePath, sizeBytes: result.sizeBytes };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Backup failed.",
        };
      }
    },
  );

  ipcMain.handle(
    "backup:restore",
    async (event, authToken: string): Promise<BackupRestoreResult> => {
      const user = requireAuthUser(authToken);
      assertRouteWrite(user.role, ROUTE_ID);

      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || win.isDestroyed()) {
        return { ok: false, error: "No window available for restore." };
      }

      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: "Restore database from backup",
        filters: [{ name: "SQLite database", extensions: ["db"] }],
        properties: ["openFile"],
      });

      if (canceled || !filePaths?.[0]) {
        return { ok: false, cancelled: true };
      }

      const sourcePath = filePaths[0];
      const confirm = dialog.showMessageBoxSync(win, {
        type: "warning",
        buttons: ["Restore and restart", "Cancel"],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
        title: "Restore database",
        message: "Replace all application data?",
        detail:
          "This replaces ALL sales, stock, delivery orders, and settings in the live database with the selected backup file. The current database will be renamed to sales.db.old-{timestamp} in the data folder. The application will restart automatically. This cannot be undone except by restoring another backup.",
      });

      if (confirm !== 0) {
        return { ok: false, cancelled: true };
      }

      try {
        restoreBackup(sourcePath);
        app.relaunch();
        app.exit(0);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Restore failed.",
        };
      }
    },
  );

  ipcMain.handle(
    "backup:getSchedule",
    (_event, authToken: string): BackupScheduleStatus => {
      const user = requireAuthUser(authToken);
      assertRouteRead(user.role, ROUTE_ID);
      return getScheduleStatus();
    },
  );

  ipcMain.handle(
    "backup:updateSchedule",
    (
      _event,
      authToken: string,
      patch: Partial<BackupScheduleConfig>,
    ): BackupScheduleUpdateResult => {
      const user = requireAuthUser(authToken);
      assertRouteWrite(user.role, ROUTE_ID);
      try {
        const status = updateScheduleConfig(patch);
        return { ok: true, status };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to save schedule.",
        };
      }
    },
  );

  ipcMain.handle(
    "backup:chooseDestinationFolder",
    async (event, authToken: string): Promise<BackupChooseFolderResult> => {
      const user = requireAuthUser(authToken);
      assertRouteWrite(user.role, ROUTE_ID);

      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || win.isDestroyed()) {
        return { ok: false, error: "No window available to choose a folder." };
      }

      const { canceled, filePaths } = await dialog.showOpenDialog(win, {
        title: "Choose automatic backup folder",
        properties: ["openDirectory", "createDirectory"],
      });

      if (canceled || !filePaths?.[0]) {
        return { ok: false, cancelled: true };
      }

      return { ok: true, folderPath: filePaths[0] };
    },
  );

  ipcMain.handle(
    "backup:runScheduledNow",
    (_event, authToken: string): BackupRunScheduledResult => {
      const user = requireAuthUser(authToken);
      assertRouteWrite(user.role, ROUTE_ID);
      try {
        const result = runScheduledBackup();
        return {
          ok: true,
          filePath: result.filePath,
          sizeBytes: result.sizeBytes,
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Automatic backup failed.",
        };
      }
    },
  );
}
