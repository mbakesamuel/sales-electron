import { getDatabase } from "../db/index.js";

type AppDatabase = ReturnType<typeof getDatabase>;

export function loadSessionIdleTimeoutMinutes(
  db: AppDatabase = getDatabase(),
): number {
  try {
    const columns = db
      .prepare(`PRAGMA table_info(CompanySettings)`)
      .all() as Array<{ name: string }>;
    if (!columns.some((col) => col.name === "sessionIdleTimeoutMinutes")) {
      return 0;
    }

    const row = db
      .prepare(
        `SELECT sessionIdleTimeoutMinutes
         FROM CompanySettings
         WHERE id = 'default'`,
      )
      .get() as { sessionIdleTimeoutMinutes: number | null } | undefined;

    const minutes = Number(row?.sessionIdleTimeoutMinutes ?? 0);
    if (!Number.isFinite(minutes) || minutes < 0) {
      return 0;
    }
    return Math.trunc(minutes);
  } catch {
    return 0;
  }
}
