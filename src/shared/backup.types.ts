export interface BackupInfo {
  userDataDir: string;
  dbPath: string;
  dbSizeBytes: number;
  walSizeBytes: number;
  lastBackupAt: string | null;
  lastBackupPath: string | null;
  lastBackupSizeBytes: number | null;
}

export type BackupCreateResult =
  | { ok: true; filePath: string; sizeBytes: number }
  | { ok: false; cancelled?: boolean; error?: string };

export type BackupRestoreResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; error?: string };

export interface BackupScheduleConfig {
  enabled: boolean;
  destinationDir: string | null;
  /** Local time of day in 24h `HH:mm` format. */
  timeOfDay: string;
  /** Number of automatic backup files to keep in the destination folder. */
  retentionCount: number;
}

export interface BackupScheduleStatus {
  config: BackupScheduleConfig;
  lastAutoBackupAt: string | null;
  lastAutoBackupPath: string | null;
  lastAutoBackupError: string | null;
  nextRunAt: string | null;
}

export type BackupScheduleUpdateResult =
  | { ok: true; status: BackupScheduleStatus }
  | { ok: false; error: string };

export type BackupChooseFolderResult =
  | { ok: true; folderPath: string }
  | { ok: false; cancelled?: boolean; error?: string };

export type BackupRunScheduledResult =
  | { ok: true; filePath: string; sizeBytes: number }
  | { ok: false; error: string };
