import type Database from "better-sqlite3";
import { formatQty, parseQty } from "./decimal.js";
import { applyMovement } from "./post.js";

function resolveSellableStorageLocation(
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

export function deductStockForValidatedSale(
  db: Database.Database,
  saleId: string,
  userId: string,
  occurredAt: string,
): void {
  const sale = db
    .prepare(
      `SELECT salesPointId, saleProductMode, invoiceNo
       FROM Sale
       WHERE id = ?`,
    )
    .get(saleId) as
    | {
        salesPointId: number | null;
        saleProductMode: string | null;
        invoiceNo: string;
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
      occurredAt,
      userId,
      sourceKind: "SALE",
      sourceId: saleId,
      condition: "SELLABLE",
      notes: `Sale ${sale.invoiceNo}`,
    });
  }
}
