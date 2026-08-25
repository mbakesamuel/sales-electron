import type Database from "better-sqlite3";
import type { StockCondition, StockMovementKind } from "../../shared/stock.types.js";
import { parseQty } from "./decimal.js";
import { signedDeltaForKind } from "./post.js";

const QTY_EPS = 0.000001;

export interface StockBalanceAsOfRow {
  salesPointId: number;
  productId: number;
  storageLocationId: number | null;
  condition: StockCondition;
  qty: number;
}

function balanceKey(
  salesPointId: number,
  productId: number,
  storageLocationId: number | null,
  condition: StockCondition,
): string {
  const loc = storageLocationId == null ? "null" : String(storageLocationId);
  return `${salesPointId}:${productId}:${loc}:${condition}`;
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
    storageLocationId: number | null;
    condition: string;
    kind: string;
    qty: string;
  }>;

  const totals = new Map<string, StockBalanceAsOfRow>();

  for (const row of rows) {
    const condition = (row.condition === "UNSELLABLE" ? "UNSELLABLE" : "SELLABLE") as StockCondition;
    const key = balanceKey(row.salesPointId, row.productId, row.storageLocationId, condition);
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
  storageLocationId: number | null,
  asOfDateIso: string,
  excludeSaleId?: string | null,
): number {
  const asOf = asOfDateIso.slice(0, 10);
  const locationClause =
    storageLocationId == null
      ? "storageLocationId IS NULL"
      : "storageLocationId = ?";
  const locationParams =
    storageLocationId == null ? [] : [storageLocationId];

  const rows = (
    excludeSaleId
      ? db
          .prepare(
            `SELECT kind, qty
             FROM StockMovement
             WHERE salesPointId = ?
               AND productId = ?
               AND ${locationClause}
               AND condition = 'SELLABLE'
               AND substr(occurredAt, 1, 10) <= ?
               AND NOT (sourceKind = 'SALE' AND sourceId = ?)`,
          )
          .all(salesPointId, productId, ...locationParams, asOf, excludeSaleId)
      : db
          .prepare(
            `SELECT kind, qty
             FROM StockMovement
             WHERE salesPointId = ?
               AND productId = ?
               AND ${locationClause}
               AND condition = 'SELLABLE'
               AND substr(occurredAt, 1, 10) <= ?`,
          )
          .all(salesPointId, productId, ...locationParams, asOf)
  ) as Array<{ kind: string; qty: string }>;

  let total = 0;
  for (const row of rows) {
    total += signedDeltaForKind(row.kind as StockMovementKind, row.qty);
  }
  return total;
}

/** Live sellable qty from StockBalance (what posting can actually deplete). */
export function getLiveSellableBalance(
  db: Database.Database,
  salesPointId: number,
  productId: number,
  storageLocationId: number | null,
): number {
  const row = (
    storageLocationId == null
      ? db.prepare(
          `SELECT qty FROM StockBalance
           WHERE salesPointId = ? AND productId = ? AND storageLocationId IS NULL
             AND condition = 'SELLABLE'`,
        )
      : db.prepare(
          `SELECT qty FROM StockBalance
           WHERE salesPointId = ? AND productId = ? AND storageLocationId = ?
             AND condition = 'SELLABLE'`,
        )
  ).get(
    ...(storageLocationId == null
      ? [salesPointId, productId]
      : [salesPointId, productId, storageLocationId]),
  ) as { qty: string } | undefined;

  return row ? parseQty(row.qty) : 0;
}

/**
 * Qty that can leave source on a backdated transfer/sale check:
 * min(historical as-of sellable, live sellable). Prevents claiming stock that
 * already left in a later movement while still respecting period history.
 */
export function getTransferableSellableBalanceAsOf(
  db: Database.Database,
  salesPointId: number,
  productId: number,
  storageLocationId: number | null,
  asOfDateIso: string,
): number {
  const asOfQty = getSellableBalanceAsOf(
    db,
    salesPointId,
    productId,
    storageLocationId,
    asOfDateIso,
  );
  const liveQty = getLiveSellableBalance(
    db,
    salesPointId,
    productId,
    storageLocationId,
  );
  return Math.min(asOfQty, Math.max(0, liveQty));
}
