import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type {
  BackupScheduleConfig,
  BackupScheduleStatus,
} from "../../shared/backup.types.js";
import { createBackup } from "./backup.js";

const SCHEDULE_FILE = "backup-schedule.json";
const AUTO_BACKUP_PREFIX = "sales-auto-backup-";
const TICK_MS = 60_000;

interface StoredSchedule extends BackupScheduleConfig {
  lastAutoBackupAt: string | null;
  lastAutoBackupPath: string | null;
  lastAutoBackupError: string | null;
  /** Local calendar date (YYYY-MM-DD) when the scheduled run last fired. */
  lastScheduledRunDate: string | null;
}

const DEFAULT_CONFIG: BackupScheduleConfig = {
  enabled: false,
  destinationDir: null,
  timeOfDay: "18:00",
  retentionCount: 7,
};

let tickTimer: ReturnType<typeof setInterval> | null = null;

function getSchedulePath(): string {
  return path.join(app.getPath("userData"), SCHEDULE_FILE);
}

function defaultStoredSchedule(): StoredSchedule {
  return {
    ...DEFAULT_CONFIG,
    lastAutoBackupAt: null,
    lastAutoBackupPath: null,
    lastAutoBackupError: null,
    lastScheduledRunDate: null,
  };
}

function parseTimeOfDay(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return { hours, minutes };
}

function localDateStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function readStoredSchedule(): StoredSchedule {
  const schedulePath = getSchedulePath();
  if (!fs.existsSync(schedulePath)) {
    return defaultStoredSchedule();
  }
  try {
    const raw = fs.readFileSync(schedulePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredSchedule>;
    const retentionCount =
      typeof parsed.retentionCount === "number"
        ? Math.min(365, Math.max(1, Math.floor(parsed.retentionCount)))
        : DEFAULT_CONFIG.retentionCount;
    const timeOfDay =
      typeof parsed.timeOfDay === "string" && parseTimeOfDay(parsed.timeOfDay)
        ? parsed.timeOfDay
        : DEFAULT_CONFIG.timeOfDay;

    return {
      enabled: parsed.enabled === true,
      destinationDir:
        typeof parsed.destinationDir === "string" && parsed.destinationDir.trim().length > 0
          ? parsed.destinationDir.trim()
          : null,
      timeOfDay,
      retentionCount,
      lastAutoBackupAt:
        typeof parsed.lastAutoBackupAt === "string" ? parsed.lastAutoBackupAt : null,
      lastAutoBackupPath:
        typeof parsed.lastAutoBackupPath === "string" ? parsed.lastAutoBackupPath : null,
      lastAutoBackupError:
        typeof parsed.lastAutoBackupError === "string" ? parsed.lastAutoBackupError : null,
      lastScheduledRunDate:
        typeof parsed.lastScheduledRunDate === "string"
          ? parsed.lastScheduledRunDate
          : null,
    };
  } catch {
    return defaultStoredSchedule();
  }
}

function writeStoredSchedule(schedule: StoredSchedule): void {
  fs.writeFileSync(getSchedulePath(), JSON.stringify(schedule, null, 2), "utf8");
}

function toConfig(schedule: StoredSchedule): BackupScheduleConfig {
  return {
    enabled: schedule.enabled,
    destinationDir: schedule.destinationDir,
    timeOfDay: schedule.timeOfDay,
    retentionCount: schedule.retentionCount,
  };
}

function computeNextRunAt(schedule: StoredSchedule, now = new Date()): string | null {
  if (!schedule.enabled || !schedule.destinationDir) {
    return null;
  }
  const time = parseTimeOfDay(schedule.timeOfDay);
  if (!time) {
    return null;
  }

  const today = localDateStamp(now);
  const candidate = new Date(now);
  candidate.setHours(time.hours, time.minutes, 0, 0);

  if (schedule.lastScheduledRunDate === today || candidate.getTime() > now.getTime()) {
    return candidate.toISOString();
  }

  const tomorrow = new Date(candidate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString();
}

export function getScheduleStatus(): BackupScheduleStatus {
  const stored = readStoredSchedule();
  return {
    config: toConfig(stored),
    lastAutoBackupAt: stored.lastAutoBackupAt,
    lastAutoBackupPath: stored.lastAutoBackupPath,
    lastAutoBackupError: stored.lastAutoBackupError,
    nextRunAt: computeNextRunAt(stored),
  };
}

function validateDestinationDir(destinationDir: string): void {
  const resolved = path.resolve(destinationDir);
  if (!fs.existsSync(resolved)) {
    throw new Error("Destination folder does not exist.");
  }
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    throw new Error("Destination path is not a folder.");
  }
  fs.accessSync(resolved, fs.constants.W_OK);
}

export function updateScheduleConfig(
  patch: Partial<BackupScheduleConfig>,
): BackupScheduleStatus {
  const stored = readStoredSchedule();

  if (patch.enabled != null) {
    stored.enabled = patch.enabled === true;
  }
  if (patch.destinationDir !== undefined) {
    if (patch.destinationDir == null || patch.destinationDir.trim().length === 0) {
      stored.destinationDir = null;
    } else {
      validateDestinationDir(patch.destinationDir);
      stored.destinationDir = path.resolve(patch.destinationDir.trim());
    }
  }
  if (patch.timeOfDay != null) {
    if (!parseTimeOfDay(patch.timeOfDay)) {
      throw new Error("Time of day must use HH:mm format (24-hour clock).");
    }
    stored.timeOfDay = patch.timeOfDay.trim();
  }
  if (patch.retentionCount != null) {
    const count = Math.floor(patch.retentionCount);
    if (count < 1 || count > 365) {
      throw new Error("Retention count must be between 1 and 365.");
    }
    stored.retentionCount = count;
  }

  writeStoredSchedule(stored);
  return getScheduleStatus();
}

export function defaultAutoBackupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join("");
  return `${AUTO_BACKUP_PREFIX}${stamp}.db`;
}

export function pruneAutoBackups(destinationDir: string, retentionCount: number): void {
  const resolved = path.resolve(destinationDir);
  const entries = fs
    .readdirSync(resolved)
    .filter((name) => name.startsWith(AUTO_BACKUP_PREFIX) && name.toLowerCase().endsWith(".db"))
    .map((name) => {
      const filePath = path.join(resolved, name);
      return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const entry of entries.slice(retentionCount)) {
    fs.unlinkSync(entry.filePath);
  }
}

function shouldRunScheduledBackup(schedule: StoredSchedule, now = new Date()): boolean {
  if (!schedule.enabled || !schedule.destinationDir) {
    return false;
  }
  const time = parseTimeOfDay(schedule.timeOfDay);
  if (!time) {
    return false;
  }

  const today = localDateStamp(now);
  if (schedule.lastScheduledRunDate === today) {
    return false;
  }

  const runAt = new Date(now);
  runAt.setHours(time.hours, time.minutes, 0, 0);
  return now.getTime() >= runAt.getTime();
}

export function runScheduledBackup(now = new Date()): { filePath: string; sizeBytes: number } {
  const stored = readStoredSchedule();
  if (!stored.destinationDir) {
    throw new Error("Automatic backup destination folder is not set.");
  }

  validateDestinationDir(stored.destinationDir);
  const destPath = path.join(stored.destinationDir, defaultAutoBackupFileName(now));

  try {
    const result = createBackup(destPath);
    pruneAutoBackups(stored.destinationDir, stored.retentionCount);
    stored.lastAutoBackupAt = new Date().toISOString();
    stored.lastAutoBackupPath = result.filePath;
    stored.lastAutoBackupError = null;
    stored.lastScheduledRunDate = localDateStamp(now);
    writeStoredSchedule(stored);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automatic backup failed.";
    stored.lastAutoBackupError = message;
    writeStoredSchedule(stored);
    throw error;
  }
}

export function runScheduledBackupIfDue(): void {
  const stored = readStoredSchedule();
  if (!shouldRunScheduledBackup(stored)) {
    return;
  }
  try {
    runScheduledBackup();
  } catch (error) {
    console.error("Scheduled backup failed:", error);
  }
}

export function startBackupScheduler(): void {
  if (tickTimer != null) {
    return;
  }
  runScheduledBackupIfDue();
  tickTimer = setInterval(() => {
    runScheduledBackupIfDue();
  }, TICK_MS);
}

export function stopBackupScheduler(): void {
  if (tickTimer != null) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}
