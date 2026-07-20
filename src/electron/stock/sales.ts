import type Database from "better-sqlite3";
import { getSellableBalanceAsOf } from "./asOfBalance.js";
import { formatQty, parseQty } from "./decimal.js";
import { InsufficientStockError } from "./errors.js";
import { applyMovement } from "./post.js";

export { getSellableBalanceAsOf } from "./asOfBalance.js";

export function resolveSellableStorageLocation(
  db: Database.Database,
  salesPointId: number,
  preferredLocationId: number | null,
  isBottleMode: boolean,
): number {
  if (preferredLocationId != null) {
    const preferred = db
      .prepare(
        `SELECT id FROM StorageLocation
         WHERE id = ? AND salesPointId = ? AND isSellable = 1`,
      )
      .get(preferredLocationId, salesPointId) as { id: number } | undefined;

    if (preferred) {
      return preferred.id;
    }
  }

  if (isBottleMode) {
    const bottleLocation = db
      .prepare(
        `SELECT sl.id
         FROM StorageLocation sl
         INNER JOIN Location l ON l.id = sl.locationId
         WHERE sl.salesPointId = ? AND sl.isSellable = 1
           AND LOWER(l.locationName) LIKE '%bottle%'
         ORDER BY sl.isDefault DESC, sl.id ASC
         LIMIT 1`,
      )
      .get(salesPointId) as { id: number } | undefined;

    if (bottleLocation) {
      return bottleLocation.id;
    }
  }

  const fallback = db
    .prepare(
      `SELECT id FROM StorageLocation
       WHERE salesPointId = ? AND isSellable = 1
       ORDER BY isDefault DESC, id ASC
       LIMIT 1`,
    )
    .get(salesPointId) as { id: number } | undefined;

  if (!fallback) {
    throw new Error("No sellable storage location is configured for this sales point.");
  }

  return fallback.id;
}

export interface SaleStockLineInput {
  productId: number;
  qtyKg: string;
  qtyUnits?: string | null;
  storageLocationId?: number | null;
}

/**
 * Ensures each sale line is covered by sellable stock as of dateIssued
 * at the resolved storage location (running reservation within the sale).
 */
export function assertSaleLinesStockAsOf(
  db: Database.Database,
  args: {
    salesPointId: number;
    dateIssued: string;
    isBottleMode: boolean;
    lines: SaleStockLineInput[];
    excludeSaleId?: string | null;
  },
): void {
  const asOf = args.dateIssued.slice(0, 10);
  const reserved = new Map<string, number>();

  for (const line of args.lines) {
    const rawQty = args.isBottleMode ? (line.qtyUnits ?? line.qtyKg) : line.qtyKg;
    const qty = parseQty(rawQty);
    if (qty <= 0) {
      continue;
    }

    const storageLocationId = resolveSellableStorageLocation(
      db,
      args.salesPointId,
      line.storageLocationId ?? null,
      args.isBottleMode,
    );

    const key = `${line.productId}:${storageLocationId}`;
    const alreadyReserved = reserved.get(key) ?? 0;
    const available = getSellableBalanceAsOf(
      db,
      args.salesPointId,
      line.productId,
      storageLocationId,
      asOf,
      args.excludeSaleId,
    );
    const remaining = available - alreadyReserved;

    if (remaining + 0.000001 < qty) {
      const product = db
        .prepare(`SELECT productName FROM Product WHERE productId = ?`)
        .get(line.productId) as { productName: string } | undefined;
      const location = db
        .prepare(
          `SELECT l.locationName AS name
           FROM StorageLocation sl
           INNER JOIN Location l ON l.id = sl.locationId
           WHERE sl.id = ?`,
        )
        .get(storageLocationId) as { name: string } | undefined;

      const productLabel = product?.productName ?? `product ${line.productId}`;
      const locationLabel = location?.name ?? `location ${storageLocationId}`;
      throw new InsufficientStockError(
        `Insufficient stock as of ${asOf} for ${productLabel} at ${locationLabel} ` +
          `(available ${Math.max(0, remaining).toLocaleString()}, needed ${qty.toLocaleString()}).`,
      );
    }

    reserved.set(key, alreadyReserved + qty);
  }
}

function noonOnDate(isoDate: string): string {
  return `${isoDate.slice(0, 10)}T12:00:00`;
}

export function deductStockForValidatedSale(
  db: Database.Database,
  saleId: string,
  userId: string,
  occurredAt: string,
): void {
  const sale = db
    .prepare(
      `SELECT salesPointId, saleProductMode, invoiceNo, dateIssued
       FROM Sale
       WHERE id = ?`,
    )
    .get(saleId) as
    | {
        salesPointId: number | null;
        saleProductMode: string | null;
        invoiceNo: string;
        dateIssued: string | null;
      }
    | undefined;

  if (!sale?.salesPointId) {
    return;
  }

  const existing = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM StockMovement
       WHERE sourceKind = 'SALE' AND sourceId = ?`,
    )
    .get(saleId) as { count: number };

  if (existing.count > 0) {
    return;
  }

  const isBottleMode = sale.saleProductMode === "BOTTLE";
  const movementAt = sale.dateIssued
    ? noonOnDate(String(sale.dateIssued))
    : occurredAt;

  const lines = db
    .prepare(
      `SELECT productId, qtyKg, qtyUnits, storageLocationId
       FROM SaleLine
       WHERE saleId = ?
       ORDER BY id ASC`,
    )
    .all(saleId) as Array<{
    productId: number;
    qtyKg: string;
    qtyUnits: string | null;
    storageLocationId: number | null;
  }>;

  for (const line of lines) {
    const rawQty = isBottleMode ? (line.qtyUnits ?? line.qtyKg) : line.qtyKg;
    const qty = parseQty(rawQty);
    if (qty <= 0) {
      continue;
    }

    const storageLocationId = resolveSellableStorageLocation(
      db,
      sale.salesPointId,
      line.storageLocationId,
      isBottleMode,
    );

    applyMovement(db, {
      salesPointId: sale.salesPointId,
      productId: line.productId,
      storageLocationId,
      qty: formatQty(qty),
      kind: "SALE",
      occurredAt: movementAt,
      userId,
      sourceKind: "SALE",
      sourceId: saleId,
      condition: "SELLABLE",
      notes: `Sale ${sale.invoiceNo}`,
    });
  }
}
