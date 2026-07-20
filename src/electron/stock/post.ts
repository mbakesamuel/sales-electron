import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { StockCondition, StockMovementKind } from "../../shared/stock.types.js";
import { formatQty, parseQty } from "./decimal.js";
import { InsufficientStockError } from "./errors.js";

export interface ApplyMovementInput {
  salesPointId: number;
  productId: number;
  storageLocationId: number;
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

function getBalanceQty(
  db: Database.Database,
  salesPointId: number,
  productId: number,
  storageLocationId: number,
  condition: StockCondition,
): number {
  const row = db
    .prepare(
      `SELECT qty FROM StockBalance
       WHERE salesPointId = ? AND productId = ? AND storageLocationId = ? AND condition = ?`,
    )
    .get(salesPointId, productId, storageLocationId, condition) as { qty: string } | undefined;

  return row ? parseQty(row.qty) : 0;
}

function upsertBalance(
  db: Database.Database,
  salesPointId: number,
  productId: number,
  storageLocationId: number,
  condition: StockCondition,
  nextQty: number,
): void {
  const qty = formatQty(nextQty);
  const existing = db
    .prepare(
      `SELECT qty FROM StockBalance
       WHERE salesPointId = ? AND productId = ? AND storageLocationId = ? AND condition = ?`,
    )
    .get(salesPointId, productId, storageLocationId, condition);

  if (existing) {
    db.prepare(
      `UPDATE StockBalance
       SET qty = ?, updatedAt = datetime('now')
       WHERE salesPointId = ? AND productId = ? AND storageLocationId = ? AND condition = ?`,
    ).run(qty, salesPointId, productId, storageLocationId, condition);
    return;
  }

  db.prepare(
    `INSERT INTO StockBalance (salesPointId, productId, storageLocationId, condition, qty)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(salesPointId, productId, storageLocationId, condition, qty);
}

export function applyMovement(db: Database.Database, input: ApplyMovementInput): void {
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

  if (next < -0.000001) {
    throw new InsufficientStockError(
      `Insufficient stock for product ${input.productId} at location ${input.storageLocationId}.`,
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
    storageLocationId: number;
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
): void {
  const row = db
    .prepare(`SELECT id FROM StorageLocation WHERE id = ? AND salesPointId = ?`)
    .get(storageLocationId, salesPointId);

  if (!row) {
    throw new Error("Storage location does not belong to the selected sales point.");
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
): void {
  for (const line of lines) {
    const available = getBalanceQty(
      db,
      fromSalesPointId,
      line.productId,
      line.fromStorageLocationId,
      "SELLABLE",
    );
    if (available + 0.000001 < parseQty(line.qty)) {
      throw new InsufficientStockError(
        `Insufficient stock for product ${line.productId} at the selected source location.`,
      );
    }
  }
}
