import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { StockCondition, StockMovementKind } from "../../shared/stock.types.js";
import { getTransferableSellableBalanceAsOf } from "./asOfBalance.js";
import { formatQty, parseQty } from "./decimal.js";
import { InsufficientStockError } from "./errors.js";
import { assertMovementLocationRules } from "./productStorage.js";

export interface ApplyMovementInput {
  salesPointId: number;
  productId: number;
  storageLocationId: number | null;
  qty: string;
  kind: StockMovementKind;
  occurredAt: string;
  userId: string;
  sourceKind: string;
  sourceId: string;
  condition?: StockCondition;
  notes?: string | null;
}

export function signedDeltaForKind(kind: StockMovementKind, qty: string): number {
  const amount = parseQty(qty);
  switch (kind) {
    case "RECEIPT":
    case "TRANSFER_IN":
    case "SALE_REVERSAL":
      return amount;
    case "TRANSFER_OUT":
    case "SALE":
      return -amount;
    case "ADJUSTMENT":
      return amount;
    default:
      return amount;
  }
}

const QTY_EPS = 0.000001;

function productLabel(db: Database.Database, productId: number): string {
  const row = db
    .prepare(`SELECT productName FROM Product WHERE productId = ?`)
    .get(productId) as { productName: string } | undefined;
  return row?.productName?.trim() || `product ${productId}`;
}

function storageLocationLabel(
  db: Database.Database,
  storageLocationId: number | null,
): string {
  if (storageLocationId == null) {
    return "collection point";
  }
  const row = db
    .prepare(
      `SELECT l.locationName AS name
       FROM StorageLocation sl
       INNER JOIN Location l ON l.id = sl.locationId
       WHERE sl.id = ?`,
    )
    .get(storageLocationId) as { name: string } | undefined;
  return row?.name?.trim() || `location ${storageLocationId}`;
}

function getBalanceQty(
  db: Database.Database,
  salesPointId: number,
  productId: number,
  storageLocationId: number | null,
  condition: StockCondition,
): number {
  const row = (
    storageLocationId == null
      ? db.prepare(
          `SELECT qty FROM StockBalance
           WHERE salesPointId = ? AND productId = ? AND storageLocationId IS NULL AND condition = ?`,
        )
      : db.prepare(
          `SELECT qty FROM StockBalance
           WHERE salesPointId = ? AND productId = ? AND storageLocationId = ? AND condition = ?`,
        )
  ).get(
    ...(storageLocationId == null
      ? [salesPointId, productId, condition]
      : [salesPointId, productId, storageLocationId, condition]),
  ) as { qty: string } | undefined;

  return row ? parseQty(row.qty) : 0;
}

/**
 * Storage location occupancy rules (non-zero on-hand, any condition):
 * - Bottled products may share a location with other bottled products.
 * - Non-bottled (bulk) products: at most one product per location.
 * - Bottled and non-bottled stock must never share a location.
 */
function assertStorageLocationProductRules(
  db: Database.Database,
  salesPointId: number,
  storageLocationId: number,
  productId: number,
): void {
  const incoming = db
    .prepare(
      `SELECT p.productName, COALESCE(pc.isBottled, 0) AS isBottled
       FROM Product p
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE p.productId = ?`,
    )
    .get(productId) as { productName: string; isBottled: number } | undefined;
  const incomingName = incoming?.productName ?? `product #${productId}`;
  const incomingBottled = (incoming?.isBottled ?? 0) === 1;

  const others = db
    .prepare(
      `SELECT sb.productId, p.productName, loc.locationName, sb.qty,
              COALESCE(pc.isBottled, 0) AS isBottled
       FROM StockBalance sb
       INNER JOIN Product p ON p.productId = sb.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       INNER JOIN StorageLocation sl ON sl.id = sb.storageLocationId
       INNER JOIN Location loc ON loc.id = sl.locationId
       WHERE sb.salesPointId = ?
         AND sb.storageLocationId = ?
         AND sb.productId != ?`,
    )
    .all(salesPointId, storageLocationId, productId) as Array<{
    productId: number;
    productName: string;
    locationName: string;
    qty: string;
    isBottled: number;
  }>;

  const occupied = others.filter((row) => Math.abs(parseQty(row.qty)) > QTY_EPS);
  if (occupied.length === 0) {
    return;
  }

  const locationName = occupied[0].locationName;
  const kindMismatch = occupied.find(
    (row) => ((row.isBottled === 1) !== incomingBottled),
  );
  if (kindMismatch) {
    if (incomingBottled) {
      throw new Error(
        `"${locationName}" already holds bulk stock (${kindMismatch.productName}). ` +
          `Clear that stock before storing bottled product ${incomingName} in the same location.`,
      );
    }
    throw new Error(
      `"${locationName}" already holds bottled stock (${kindMismatch.productName}). ` +
        `Clear that stock before storing bulk product ${incomingName} in the same location.`,
    );
  }

  // Bottled products may co-mingle with other bottled products.
  if (incomingBottled) {
    return;
  }

  // Non-bottled: at most one product with non-zero on-hand.
  const bulkOther = occupied.find((row) => row.isBottled !== 1);
  if (!bulkOther) {
    return;
  }

  throw new Error(
    `"${locationName}" already holds ${bulkOther.productName}. ` +
      `Clear that stock before storing ${incomingName} in the same location.`,
  );
}

function upsertBalance(
  db: Database.Database,
  salesPointId: number,
  productId: number,
  storageLocationId: number | null,
  condition: StockCondition,
  nextQty: number,
): void {
  const qty = formatQty(nextQty);
  const existing = (
    storageLocationId == null
      ? db.prepare(
          `SELECT qty FROM StockBalance
           WHERE salesPointId = ? AND productId = ? AND storageLocationId IS NULL AND condition = ?`,
        )
      : db.prepare(
          `SELECT qty FROM StockBalance
           WHERE salesPointId = ? AND productId = ? AND storageLocationId = ? AND condition = ?`,
        )
  ).get(
    ...(storageLocationId == null
      ? [salesPointId, productId, condition]
      : [salesPointId, productId, storageLocationId, condition]),
  );

  if (existing) {
    (
      storageLocationId == null
        ? db.prepare(
            `UPDATE StockBalance
             SET qty = ?, updatedAt = datetime('now')
             WHERE salesPointId = ? AND productId = ? AND storageLocationId IS NULL AND condition = ?`,
          )
        : db.prepare(
            `UPDATE StockBalance
             SET qty = ?, updatedAt = datetime('now')
             WHERE salesPointId = ? AND productId = ? AND storageLocationId = ? AND condition = ?`,
          )
    ).run(
      ...(storageLocationId == null
        ? [qty, salesPointId, productId, condition]
        : [qty, salesPointId, productId, storageLocationId, condition]),
    );
    return;
  }

  db.prepare(
    `INSERT INTO StockBalance (salesPointId, productId, storageLocationId, condition, qty)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(salesPointId, productId, storageLocationId, condition, qty);
}

export function applyMovement(db: Database.Database, input: ApplyMovementInput): void {
  assertMovementLocationRules(db, input.productId, input.storageLocationId);

  const condition = input.condition ?? "SELLABLE";
  const signedDelta = signedDeltaForKind(input.kind, input.qty);
  const current = getBalanceQty(
    db,
    input.salesPointId,
    input.productId,
    input.storageLocationId,
    condition,
  );
  const next = current + signedDelta;

  if (next < -QTY_EPS) {
    throw new InsufficientStockError(
      `Insufficient stock for ${productLabel(db, input.productId)} at ${storageLocationLabel(db, input.storageLocationId)}.`,
    );
  }

  // Incoming stock into a location that already holds incompatible stock.
  if (
    input.storageLocationId != null &&
    signedDelta > QTY_EPS &&
    next > QTY_EPS
  ) {
    assertStorageLocationProductRules(
      db,
      input.salesPointId,
      input.storageLocationId,
      input.productId,
    );
  }

  upsertBalance(
    db,
    input.salesPointId,
    input.productId,
    input.storageLocationId,
    condition,
    next,
  );

  const storedQty =
    input.kind === "ADJUSTMENT" ? formatQty(signedDelta) : formatQty(Math.abs(signedDelta));

  db.prepare(
    `INSERT INTO StockMovement (
      id, salesPointId, productId, kind, qty, occurredAt, userId,
      sourceKind, sourceId, notes, storageLocationId, condition
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    input.salesPointId,
    input.productId,
    input.kind,
    storedQty,
    input.occurredAt,
    input.userId,
    input.sourceKind,
    input.sourceId,
    input.notes ?? null,
    input.storageLocationId,
    condition,
  );
}

export function reverseMovementsBySource(
  db: Database.Database,
  input: {
    sourceKind: string;
    sourceId: string;
    userId: string;
    occurredAt: string;
    notes?: string | null;
  },
): void {
  const rows = db
    .prepare(
      `SELECT salesPointId, productId, storageLocationId, condition, kind, qty
       FROM StockMovement
       WHERE sourceKind = ? AND sourceId = ?
       ORDER BY createdAt ASC`,
    )
    .all(input.sourceKind, input.sourceId) as Array<{
    salesPointId: number;
    productId: number;
    storageLocationId: number | null;
    condition: StockCondition;
    kind: StockMovementKind;
    qty: string;
  }>;

  for (const row of rows) {
    const signed = signedDeltaForKind(row.kind, row.qty);
    applyMovement(db, {
      salesPointId: row.salesPointId,
      productId: row.productId,
      storageLocationId: row.storageLocationId,
      condition: row.condition,
      qty: formatQty(-signed),
      kind: "ADJUSTMENT",
      occurredAt: input.occurredAt,
      userId: input.userId,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      notes: input.notes ?? `Reversal of ${row.kind}`,
    });
  }
}

export function movementSignedDelta(kind: StockMovementKind, qty: string): string {
  return formatQty(signedDeltaForKind(kind, qty));
}

export function assertStorageLocationForSalesPoint(
  db: Database.Database,
  salesPointId: number,
  storageLocationId: number,
  purpose: "receipt" | "sale" | "any" = "any",
  requireSalesTank = false,
): void {
  const row = db
    .prepare(
      `SELECT id, COALESCE(isSalesTank, 0) AS isSalesTank
       FROM StorageLocation
       WHERE id = ? AND salesPointId = ?`,
    )
    .get(storageLocationId, salesPointId) as
    | { id: number; isSalesTank: number }
    | undefined;

  if (!row) {
    throw new Error("Storage location does not belong to the selected collection point.");
  }

  if (purpose === "receipt" && row.isSalesTank === 1) {
    throw new Error("Receipts cannot be posted to a sales tank location.");
  }

  // Loose Palm Oil only when App setting requireSalesTank is on.
  if (purpose === "sale" && requireSalesTank && row.isSalesTank !== 1) {
    throw new Error("Loose Palm Oil invoices must use a sales tank location.");
  }
}

export function assertTransferLinesAvailableAtSource(
  db: Database.Database,
  fromSalesPointId: number,
  lines: Array<{
    productId: number;
    qty: string;
    fromStorageLocationId: number;
  }>,
  asOfDateIso: string,
): void {
  const asOf = asOfDateIso.slice(0, 10);
  const reserved = new Map<string, number>();

  for (const line of lines) {
    const qty = parseQty(line.qty);
    if (qty <= 0) {
      continue;
    }

    const key = `${line.productId}:${line.fromStorageLocationId}`;
    const alreadyReserved = reserved.get(key) ?? 0;
    const available = getTransferableSellableBalanceAsOf(
      db,
      fromSalesPointId,
      line.productId,
      line.fromStorageLocationId,
      asOf,
    );
    const remaining = available - alreadyReserved;
    if (remaining + 0.000001 < qty) {
      throw new InsufficientStockError(
        `Insufficient stock for ${productLabel(db, line.productId)} at ${storageLocationLabel(db, line.fromStorageLocationId)} ` +
          `as of ${asOf} (transferable ${Math.max(0, remaining).toLocaleString()}, needed ${qty.toLocaleString()}).`,
      );
    }

    reserved.set(key, alreadyReserved + qty);
  }
}
