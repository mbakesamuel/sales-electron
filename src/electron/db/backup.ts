import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { BackupInfo } from "../../shared/backup.types.js";
import { closeDatabase, getDatabase, getDatabaseFilePath } from "./index.js";

const SQLITE_HEADER = "SQLite format 3\u0000";
const META_FILE = "backup-meta.json";

interface BackupMeta {
  createdAt: string;
  filePath: string;
  sizeBytes: number;
}

function getUserDataDir(): string {
  return app.getPath("userData");
}

function getMetaPath(): string {
  return path.join(getUserDataDir(), META_FILE);
}

function readMeta(): BackupMeta | null {
  const metaPath = getMetaPath();
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    const parsed = JSON.parse(raw) as BackupMeta;
    if (
      typeof parsed.createdAt === "string" &&
      typeof parsed.filePath === "string" &&
      typeof parsed.sizeBytes === "number"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function writeMeta(meta: BackupMeta): void {
  fs.writeFileSync(getMetaPath(), JSON.stringify(meta, null, 2), "utf8");
}

function fileSizeIfExists(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

export function validateBackupFile(filePath: string): void {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error("Backup file not found.");
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size < 100) {
    throw new Error("Backup file is empty or too small to be a valid database.");
  }
  const header = Buffer.alloc(16);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, header, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (header.toString("utf8", 0, 16) !== SQLITE_HEADER) {
    throw new Error("Selected file is not a valid SQLite database backup.");
  }
}

export function getBackupInfo(): BackupInfo {
  const userDataDir = getUserDataDir();
  const dbPath = getDatabaseFilePath();
  const walPath = `${dbPath}-wal`;
  const meta = readMeta();

  return {
    userDataDir,
    dbPath,
    dbSizeBytes: fileSizeIfExists(dbPath),
    walSizeBytes: fileSizeIfExists(walPath),
    lastBackupAt: meta?.createdAt ?? null,
    lastBackupPath: meta?.filePath ?? null,
    lastBackupSizeBytes: meta?.sizeBytes ?? null,
  };
}

export function createBackup(destPath: string): { filePath: string; sizeBytes: number } {
  const normalized = path.resolve(destPath);
  if (!normalized.toLowerCase().endsWith(".db")) {
    throw new Error("Backup file must use a .db extension.");
  }

  const tempPath = `${normalized}.tmp`;
  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }

  getDatabase().backup(tempPath);

  validateBackupFile(tempPath);

  if (fs.existsSync(normalized)) {
    fs.unlinkSync(normalized);
  }
  fs.renameSync(tempPath, normalized);

  const sizeBytes = fileSizeIfExists(normalized);
  writeMeta({
    createdAt: new Date().toISOString(),
    filePath: normalized,
    sizeBytes,
  });

  return { filePath: normalized, sizeBytes };
}

export function restoreBackup(sourcePath: string): void {
  const normalized = path.resolve(sourcePath);
  validateBackupFile(normalized);

  const dbPath = getDatabaseFilePath();
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const oldPath = `${dbPath}.old-${timestamp}`;

  closeDatabase();

  if (fs.existsSync(dbPath)) {
    fs.renameSync(dbPath, oldPath);
  }
  for (const sidecar of [walPath, shmPath]) {
    if (fs.existsSync(sidecar)) {
      fs.unlinkSync(sidecar);
    }
  }

  fs.copyFileSync(normalized, dbPath);
  validateBackupFile(dbPath);
}

export function defaultBackupFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join("");
  return `sales-backup-${stamp}.db`;
}
