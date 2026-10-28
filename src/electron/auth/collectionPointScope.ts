import { getDatabase } from "../db/index.js";

/** User.salesPointId when the account is active; otherwise null (unscoped). */
export function getUserCollectionPointId(userId: string): number | null {
  const row = getDatabase()
    .prepare(`SELECT salesPointId, isActive FROM User WHERE id = ?`)
    .get(userId) as { salesPointId: number | null; isActive: number } | undefined;

  if (!row?.isActive) {
    return null;
  }

  return row.salesPointId == null || !Number.isFinite(Number(row.salesPointId))
    ? null
    : Number(row.salesPointId);
}

export function assertCollectionPointScope(
  userId: string,
  salesPointId: number | null | undefined,
): void {
  const scoped = getUserCollectionPointId(userId);
  if (scoped == null) {
    return;
  }

  if (
    salesPointId == null ||
    !Number.isFinite(salesPointId) ||
    Number(salesPointId) !== scoped
  ) {
    throw new Error("You can only work within your assigned collection point.");
  }
}

export function collectionPointScopeError(
  userId: string,
  salesPointId: number | null | undefined,
): string | null {
  try {
    assertCollectionPointScope(userId, salesPointId);
    return null;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "You can only work within your assigned collection point.";
  }
}

export function filterByCollectionPointScope<T extends { id: number }>(
  rows: T[],
  scopedSalesPointId: number | null,
): T[] {
  if (scopedSalesPointId == null) {
    return rows;
  }
  return rows.filter((row) => row.id === scopedSalesPointId);
}
