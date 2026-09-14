import { BrowserWindow, ipcMain } from "electron";
import {
  assertRouteRead,
  assertRouteWrite,
} from "../auth/permissions/service.js";
import { requireAuthUser } from "../auth/requireUser.js";
import { getDatabase } from "../db/index.js";
import {
  getPendingOutboxBatch,
  getSyncState,
  updateSyncState,
} from "../sync/syncOutbox.js";
import { getSyncService } from "../sync/syncService.js";
import type {
  SyncOutboxItem,
  SyncProgressState,
  SyncStateConfig,
  TestConnectionResult,
} from "../../shared/sync.types.js";

const ROUTE_ID = "sync-settings";

export function registerSyncHandlers(): void {
  const syncService = getSyncService();

  // Forward background sync status changes to all renderer windows
  syncService.on("statusChanged", (status: SyncProgressState) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send("sync:statusChanged", status);
      }
    }
  });

  ipcMain.handle(
    "sync:getStatus",
    (): SyncProgressState => {
      return syncService.getStatus();
    },
  );

  ipcMain.handle(
    "sync:triggerNow",
    async (_event, authToken: string): Promise<{ ok: boolean; message?: string }> => {
      requireAuthUser(authToken);
      return syncService.syncNow();
    },
  );

  ipcMain.handle(
    "sync:backfillAllData",
    async (_event, authToken: string) => {
      const user = requireAuthUser(authToken);
      assertRouteWrite(user.role, ROUTE_ID);
      return syncService.backfillAllData();
    },
  );

  ipcMain.handle(
    "sync:getConfig",
    (_event, authToken: string): SyncStateConfig => {
      const user = requireAuthUser(authToken);
      assertRouteRead(user.role, ROUTE_ID);
      const db = getDatabase();
      return getSyncState(db);
    },
  );

  ipcMain.handle(
    "sync:saveConfig",
    async (
      _event,
      authToken: string,
      config: Partial<SyncStateConfig>,
    ): Promise<{ ok: boolean; error?: string }> => {
      const user = requireAuthUser(authToken);
      assertRouteWrite(user.role, ROUTE_ID);

      try {
        const db = getDatabase();
        updateSyncState(db, config);

        const updated = getSyncState(db);
        if (config.syncServerUrl) {
          syncService["networkMonitor"].setServerUrl(updated.syncServerUrl);
        }
        if (config.autoSyncEnabled !== undefined) {
          if (updated.autoSyncEnabled) {
            syncService.startAutoSync();
          } else {
            syncService.stopAutoSync();
          }
        }

        syncService.emitStatus();
        return { ok: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg };
      }
    },
  );

  ipcMain.handle(
    "sync:getPendingList",
    (
      _event,
      authToken: string,
      limit = 50,
    ): SyncOutboxItem[] => {
      const user = requireAuthUser(authToken);
      assertRouteRead(user.role, ROUTE_ID);
      const db = getDatabase();
      return getPendingOutboxBatch(db, limit);
    },
  );

  ipcMain.handle(
    "sync:testConnection",
    async (
      _event,
      _authToken: string,
      serverUrl?: string,
    ): Promise<TestConnectionResult> => {
      return syncService.testConnection(serverUrl);
    },
  );
}
