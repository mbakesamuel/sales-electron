import { getAuthToken } from "./db.ts";
import { getElectronApi } from "./client.ts";
import type { BackupScheduleConfig } from "../../shared/backup.types.ts";

function requireAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Login required.");
  }
  return token;
}

export function getAuthenticatedBackup() {
  const api = getElectronApi().backup;

  return {
    getInfo: () => api.getInfo(requireAuthToken()),
    create: () => api.create(requireAuthToken()),
    restore: () => api.restore(requireAuthToken()),
    getSchedule: () => api.getSchedule(requireAuthToken()),
    updateSchedule: (patch: Partial<BackupScheduleConfig>) =>
      api.updateSchedule(requireAuthToken(), patch),
    chooseDestinationFolder: () => api.chooseDestinationFolder(requireAuthToken()),
    runScheduledNow: () => api.runScheduledNow(requireAuthToken()),
  };
}
