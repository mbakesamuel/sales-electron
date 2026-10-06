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
 * Dev: project root, then packaging/app.settings.config.
 */
export function getAppSettingsConfigPath(): string {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath("exe")), CONFIG_FILE_NAME);
  }
  const rootPath = path.join(process.cwd(), CONFIG_FILE_NAME);
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }
  return path.join(process.cwd(), "packaging", CONFIG_FILE_NAME);
}

/**
 * Strict JSON first; if that fails (common with Windows paths like "D:\folder"),
 * normalize databaseDir backslashes to forward slashes and retry.
 */
export function parseAppSettingsJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (strictErr) {
    const normalized = raw.replace(
      /"databaseDir"\s*:\s*"([^"]*)"/,
      (_match, pathVal: string) => {
        const fixed = pathVal.replace(/\\/g, "/");
        return `"databaseDir": "${fixed}"`;
      },
    );
    try {
      return JSON.parse(normalized) as Record<string, unknown>;
    } catch {
      throw strictErr;
    }
  }
}

/**
 * Load app.settings.config. Invalid/missing JSON → defaults.
 * Unknown keys are ignored.
 */
export function loadAppSettings(): AppSettings {
  const configPath = getAppSettingsConfigPath();
  if (!fs.existsSync(configPath)) {
    console.info(
      `[app-settings] No ${CONFIG_FILE_NAME} at ${configPath}; using defaults.`,
    );
    return defaultSettings();
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = parseAppSettingsJson(raw);
    const databaseDir =
      typeof parsed.databaseDir === "string" ? parsed.databaseDir.trim() : "";
    console.info(
      `[app-settings] Loaded ${configPath}` +
        (databaseDir ? ` (databaseDir=${databaseDir})` : " (default database location)"),
    );
    return { databaseDir };
  } catch (err) {
    console.warn(
      `Failed to parse ${CONFIG_FILE_NAME} at ${configPath}; using defaults.` +
        ` Tip: use forward slashes (D:/sales-db) or escaped backslashes (D:\\\\sales-db).`,
      err instanceof Error ? err.message : err,
    );
    return defaultSettings();
  }
}
