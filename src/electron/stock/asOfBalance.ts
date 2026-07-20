import type Database from "better-sqlite3";
import type { StockCondition, StockMovementKind } from "../../shared/stock.types.js";
import { signedDeltaForKind } from "./post.js";

const QTY_EPS = 0.000001;

export interface StockBalanceAsOfRow {
  salesPointId: number;
  productId: number;
  storageLocationId: number;
  condition: StockCondition;
  qty: number;
}

/**
 * Reconstruct on-hand balances from StockMovement through asOfDateIso (inclusive).
 * Live StockBalance is not used — suitable for period-faithful reports.
 */
export function loadStockBalancesAsOf(
  db: Database.Database,
  asOfDateIso: string,
): StockBalanceAsOfRow[] {
  const asOf = asOfDateIso.slice(0, 10);
  const rows = db
    .prepare(
      `SELECT salesPointId, productId, storageLocationId, condition, kind, qty
       FROM StockMovement
       WHERE substr(occurredAt, 1, 10) <= ?`,
    )
    .all(asOf) as Array<{
    salesPointId: number;
    productId: number;
    storageLocationId: number;
    condition: string;
    kind: string;
    qty: string;
  }>;

  const totals = new Map<string, StockBalanceAsOfRow>();

  for (const row of rows) {
    const condition = (row.condition === "UNSELLABLE" ? "UNSELLABLE" : "SELLABLE") as StockCondition;
    const key = `${row.salesPointId}:${row.productId}:${row.storageLocationId}:${condition}`;
    const signed = signedDeltaForKind(row.kind as StockMovementKind, row.qty);
    const existing = totals.get(key);
    if (existing) {
      existing.qty += signed;
    } else {
      totals.set(key, {
        salesPointId: row.salesPointId,
        productId: row.productId,
        storageLocationId: row.storageLocationId,
        condition,
        qty: signed,
      });
    }
  }

  return [...totals.values()].filter((row) => Math.abs(row.qty) > QTY_EPS);
}

/** Sellable on-hand for one key, reconstructed from movements through asOfDateIso. */
export function getSellableBalanceAsOf(
  db: Database.Database,
  salesPointId: number,
  productId: number,
  storageLocationId: number,
  asOfDateIso: string,
  excludeSaleId?: string | null,
): number {
  const asOf = asOfDateIso.slice(0, 10);
  const rows = (
    excludeSaleId
      ? db
          .prepare(
            `SELECT kind, qty
             FROM StockMovement
             WHERE salesPointId = ?
               AND productId = ?
               AND storageLocationId = ?
               AND condition = 'SELLABLE'
               AND substr(occurredAt, 1, 10) <= ?
               AND NOT (sourceKind = 'SALE' AND sourceId = ?)`,
          )
          .all(salesPointId, productId, storageLocationId, asOf, excludeSaleId)
      : db
          .prepare(
            `SELECT kind, qty
             FROM StockMovement
             WHERE salesPointId = ?
               AND productId = ?
               AND storageLocationId = ?
               AND condition = 'SELLABLE'
               AND substr(occurredAt, 1, 10) <= ?`,
          )
          .all(salesPointId, productId, storageLocationId, asOf)
  ) as Array<{ kind: string; qty: string }>;

  let total = 0;
  for (const row of rows) {
    total += signedDeltaForKind(row.kind as StockMovementKind, row.qty);
  }
  return total;
}
