import type Database from "better-sqlite3";

export type ActiveSalesPoint = {
  id: number;
  name: string;
};

export type RequireActiveSalesPointResult =
  | { ok: true; id: number; name: string }
  | { ok: false; error: string };

/**
 * Active collection points for transactional pickers.
 * Null/missing isActive is treated as active (legacy rows).
 */
export function listActiveSalesPoints(
  db: Database.Database,
  limit = 500,
): ActiveSalesPoint[] {
  return db
    .prepare(
      `SELECT id, name
       FROM SalesPoint
       WHERE COALESCE(isActive, 1) = 1
       ORDER BY name COLLATE NOCASE ASC
       LIMIT ?`,
    )
    .all(limit) as ActiveSalesPoint[];
}

export function requireActiveSalesPoint(
  db: Database.Database,
  salesPointId: number,
  options?: { inactiveError?: string },
): RequireActiveSalesPointResult {
  if (!Number.isFinite(salesPointId) || salesPointId <= 0) {
    return { ok: false, error: "Collection point is required." };
  }

  const row = db
    .prepare(
      `SELECT id, name, COALESCE(isActive, 1) AS isActive
       FROM SalesPoint
       WHERE id = ?`,
    )
    .get(salesPointId) as
    | { id: number; name: string; isActive: number }
    | undefined;

  if (!row) {
    return { ok: false, error: "Collection point does not exist." };
  }

  if (row.isActive !== 1) {
    return {
      ok: false,
      error:
        options?.inactiveError ?? "Cannot use an inactive collection point.",
    };
  }

  return { ok: true, id: row.id, name: row.name };
}
