import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export type AppSettings = {
  /** Absolute directory for sales.db; empty/missing → userData. */
  databaseDir?: string;
};

const CONFIG_FILE_NAME = "app.settings.config";

function defaultSettings(): AppSettings {
  return { databaseDir: "" };
}

/**
 * Packaged: next to the .exe.
 * Dev: project root (cwd), if present.
 */
export function getAppSettingsConfigPath(): string {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath("exe")), CONFIG_FILE_NAME);
  }
  return path.join(process.cwd(), CONFIG_FILE_NAME);
}

/**
 * Load app.settings.config. Invalid/missing JSON → defaults.
 * Unknown keys are ignored.
 */
export function loadAppSettings(): AppSettings {
  const configPath = getAppSettingsConfigPath();
  if (!fs.existsSync(configPath)) {
    return defaultSettings();
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const databaseDir =
      typeof parsed.databaseDir === "string" ? parsed.databaseDir.trim() : "";
    return { databaseDir };
  } catch (err) {
    console.warn(
      `Failed to parse ${CONFIG_FILE_NAME} at ${configPath}; using defaults.`,
      err instanceof Error ? err.message : err,
    );
    return defaultSettings();
  }
}
