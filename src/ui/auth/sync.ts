import { getAuthToken } from "./db.ts";
import { getElectronApi } from "./client.ts";
import type {
  SyncProgressState,
  SyncStateConfig,
} from "../../shared/sync.types.ts";

function requireAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Login required.");
  }
  return token;
}

export function getAuthenticatedSync() {
  const api = getElectronApi().sync;

  return {
    getStatus: () => api.getStatus(),
    triggerNow: () => api.triggerNow(requireAuthToken()),
    backfillAllData: () => api.backfillAllData(requireAuthToken()),
    getConfig: () => api.getConfig(requireAuthToken()),
    saveConfig: (config: Partial<SyncStateConfig>) =>
      api.saveConfig(requireAuthToken(), config),
    getPendingList: (limit?: number) =>
      api.getPendingList(requireAuthToken(), limit),
    testConnection: (serverUrl?: string) =>
      api.testConnection(requireAuthToken(), serverUrl),
    onStatusChanged: (callback: (status: SyncProgressState) => void) =>
      api.onStatusChanged ? api.onStatusChanged(callback) : () => {},
  };
}
