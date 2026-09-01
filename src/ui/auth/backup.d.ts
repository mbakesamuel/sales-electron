import type { BackupScheduleConfig } from "../../shared/backup.types.ts";
export declare function getAuthenticatedBackup(): {
    getInfo: () => Promise<import("../../shared/backup.types.ts").BackupInfo>;
    create: () => Promise<import("../../shared/backup.types.ts").BackupCreateResult>;
    restore: () => Promise<import("../../shared/backup.types.ts").BackupRestoreResult>;
    getSchedule: () => Promise<import("../../shared/backup.types.ts").BackupScheduleStatus>;
    updateSchedule: (patch: Partial<BackupScheduleConfig>) => Promise<import("../../shared/backup.types.ts").BackupScheduleUpdateResult>;
    chooseDestinationFolder: () => Promise<import("../../shared/backup.types.ts").BackupChooseFolderResult>;
    runScheduledNow: () => Promise<import("../../shared/backup.types.ts").BackupRunScheduledResult>;
};
