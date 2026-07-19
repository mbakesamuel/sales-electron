import { randomUUID } from "node:crypto";
import type {
  CarryForwardStockBatchResult,
  CarryForwardStockFormOptions,
  CarryForwardStockOnHandRow,
  CarryForwardStockRow,
  UpsertCarryForwardStockBatchInput,
} from "../../shared/carryForwardStock.types.js";
import { assertRouteWrite } from "../auth/permissions/service.js";
import { getDatabase } from "../db/index.js";
import { getOpenPostingPeriod } from "../financialYears/service.js";
import { formatQty, parseQty } from "./decimal.js";
import { applyMovement } from "./post.js";
import { allocateAdjustmentNo } from "./sequences.js";

const ROUTE_ID = "carry-forward-stock";
const QTY_EPS = 0.000001;

function nowIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function noonUtcIsoDate(isoDate: string): string {
  return `${isoDate.slice(0, 10)}T12:00:00.000Z`;
}

function assertWrite(userId: string): { ok: true } | { ok: false; error: string } {
  const role = getDatabase()
    .prepare(`SELECT role FROM User WHERE id = ?`)
    .get(userId) as { role: string } | undefined;

  if (!role) {
    return { ok: false, error: "User not found." };
  }

  try {
    assertRouteWrite(role.role, ROUTE_ID);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Permission denied.",
    };
  }

  return { ok: true };
}

function getSellableQty(
  salesPointId: number,
  productId: number,
  storageLocationId: number,
): number {
  const row = getDatabase()
    .prepare(
      `SELECT qty FROM StockBalance
       WHERE salesPointId = ? AND productId = ? AND storageLocationId = ?
         AND condition = 'SELLABLE'`,
    )
    .get(salesPointId, productId, storageLocationId) as { qty: string } | undefined;
  return row ? parseQty(row.qty) : 0;
}

export function getCarryForwardStockFormOptions(): CarryForwardStockFormOptions {
  const db = getDatabase();
  return {
    products: db
      .prepare(
        `SELECT productId, productName, COALESCE(uom, 'Kg') AS uom
         FROM Product
         ORDER BY productName ASC`,
      )
      .all() as Array<{ productId: number; productName: string; uom: string }>,
    salesPoints: db
      .prepare(`SELECT id, name FROM SalesPoint ORDER BY name ASC`)
      .all() as Array<{ id: number; name: string }>,
    storageLocations: db
      .prepare(
        `SELECT sl.id, sl.salesPointId, l.locationName AS name,
                COALESCE(sl.isDefault, 0) AS isDefault
         FROM StorageLocation sl
         JOIN Location l ON l.id = sl.locationId
         ORDER BY sl.salesPointId ASC, COALESCE(sl.isDefault, 0) DESC, l.locationName ASC`,
      )
      .all()
      .map((row) => {
        const r = row as {
          id: number;
          salesPointId: number;
          name: string;
          isDefault: number;
        };
        return {
          id: r.id,
          salesPointId: r.salesPointId,
          name: r.name,
          isDefault: r.isDefault === 1,
        };
      }),
  };
}

export function listCarryForwardStock(): CarryForwardStockRow[] {
  const rows = getDatabase()
    .prepare(
      `SELECT DISTINCT
         a.salesPointId, sp.name AS salesPointName,
         l.storageLocationId, loc.locationName AS storageLocationName,
         l.productId, p.productName, COALESCE(p.uom, 'Kg') AS uom,
         (
           SELECT a2.adjustmentNo
           FROM StockAdjustment a2
           INNER JOIN StockAdjustmentLine l2 ON l2.adjustmentId = a2.id
           WHERE a2.sourceKind = 'CARRY_FORWARD'
             AND a2.status = 'POSTED'
             AND a2.salesPointId = a.salesPointId
             AND l2.storageLocationId = l.storageLocationId
             AND l2.productId = l.productId
           ORDER BY a2.occurredAt DESC, a2.postedAt DESC
           LIMIT 1
         ) AS lastAdjustmentNo,
         (
           SELECT substr(a2.occurredAt, 1, 10)
           FROM StockAdjustment a2
           INNER JOIN StockAdjustmentLine l2 ON l2.adjustmentId = a2.id
           WHERE a2.sourceKind = 'CARRY_FORWARD'
             AND a2.status = 'POSTED'
             AND a2.salesPointId = a.salesPointId
             AND l2.storageLocationId = l.storageLocationId
             AND l2.productId = l.productId
           ORDER BY a2.occurredAt DESC, a2.postedAt DESC
           LIMIT 1
         ) AS lastOccurredAt
       FROM StockAdjustment a
       INNER JOIN StockAdjustmentLine l ON l.adjustmentId = a.id
       INNER JOIN SalesPoint sp ON sp.id = a.salesPointId
       INNER JOIN StorageLocation sl ON sl.id = l.storageLocationId
       INNER JOIN Location loc ON loc.id = sl.locationId
       INNER JOIN Product p ON p.productId = l.productId
       WHERE a.sourceKind = 'CARRY_FORWARD' AND a.status = 'POSTED'
       ORDER BY sp.name ASC, p.productName ASC, loc.locationName ASC`,
    )
    .all() as Array<{
    salesPointId: number;
    salesPointName: string;
    storageLocationId: number;
    storageLocationName: string;
    productId: number;
    productName: string;
    uom: string;
    lastAdjustmentNo: string | null;
    lastOccurredAt: string | null;
  }>;

  return rows.map((row) => ({
    salesPointId: row.salesPointId,
    salesPointName: row.salesPointName,
    storageLocationId: row.storageLocationId,
    storageLocationName: row.storageLocationName,
    productId: row.productId,
    productName: row.productName,
    uom: row.uom,
    currentQty: getSellableQty(row.salesPointId, row.productId, row.storageLocationId),
    lastAdjustmentNo: row.lastAdjustmentNo,
    lastOccurredAt: row.lastOccurredAt,
  }));
}

export function listCarryForwardStockOnHand(
  salesPointId: number,
  productId: number,
): CarryForwardStockOnHandRow[] {
  if (!Number.isFinite(salesPointId) || !Number.isFinite(productId)) {
    return [];
  }
  const rows = getDatabase()
    .prepare(
      `SELECT storageLocationId, qty
       FROM StockBalance
       WHERE salesPointId = ? AND productId = ? AND condition = 'SELLABLE'`,
    )
    .all(salesPointId, productId) as Array<{ storageLocationId: number; qty: string }>;

  return rows.map((row) => ({
    storageLocationId: row.storageLocationId,
    qty: parseQty(row.qty),
  }));
}

export function upsertCarryForwardStockBatch(
  input: UpsertCarryForwardStockBatchInput,
): CarryForwardStockBatchResult {
  const write = assertWrite(input.userId);
  if (!write.ok) {
    return write;
  }

  const period = getOpenPostingPeriod();
  if (!period) {
    return { ok: false, error: "Open a financial month before posting carry-forward stock." };
  }

  const salesPointId = Number(input.salesPointId);
  const productId = Number(input.productId);
  if (!Number.isFinite(salesPointId) || !Number.isFinite(productId)) {
    return { ok: false, error: "Sales point and product are required." };
  }

  const product = getDatabase()
    .prepare(`SELECT productId FROM Product WHERE productId = ?`)
    .get(productId) as { productId: number } | undefined;
  if (!product) {
    return { ok: false, error: "Product not found." };
  }

  const locationCheck = getDatabase().prepare(
    `SELECT id FROM StorageLocation WHERE id = ? AND salesPointId = ?`,
  );

  const deltas: Array<{ storageLocationId: number; deltaQty: number }> = [];
  for (const line of input.lines) {
    const storageLocationId = Number(line.storageLocationId);
    const onHandQty = Number(line.onHandQty);
    if (
      !Number.isFinite(storageLocationId) ||
      !Number.isFinite(onHandQty) ||
      onHandQty < 0
    ) {
      continue;
    }
    const location = locationCheck.get(storageLocationId, salesPointId) as
      | { id: number }
      | undefined;
    if (!location) {
      return {
        ok: false,
        error: "Storage location does not belong to the sales point.",
      };
    }
    const current = getSellableQty(salesPointId, productId, storageLocationId);
    const delta = onHandQty - current;
    if (Math.abs(delta) <= QTY_EPS) {
      continue;
    }
    deltas.push({ storageLocationId, deltaQty: delta });
  }

  if (deltas.length === 0) {
    return { ok: true, saved: 0, adjustmentNo: null };
  }

  const today = todayIsoDate();
  const occurredDate =
    today >= period.startDate && today <= period.endDate ? today : period.endDate;
  const occurredAt = noonUtcIsoDate(occurredDate);
  const reason = (input.notes ?? "").trim() || "Carry-forward stock";

  const db = getDatabase();
  try {
    const result = db.transaction(() => {
      const id = randomUUID();
      const adjustmentNo = allocateAdjustmentNo(db, occurredAt);
      db.prepare(
        `INSERT INTO StockAdjustment (
          id, adjustmentNo, salesPointId, occurredAt, reason, status, sourceKind, createdByUserId
        ) VALUES (?, ?, ?, ?, ?, 'DRAFT', 'CARRY_FORWARD', ?)`,
      ).run(id, adjustmentNo, salesPointId, occurredAt, reason, input.userId);

      const insertLine = db.prepare(
        `INSERT INTO StockAdjustmentLine (
          id, adjustmentId, productId, deltaQty, storageLocationId, fromCondition, toCondition
        ) VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
      );
      for (const line of deltas) {
        insertLine.run(
          randomUUID(),
          id,
          productId,
          formatQty(line.deltaQty),
          line.storageLocationId,
        );
      }

      for (const line of deltas) {
        applyMovement(db, {
          salesPointId,
          productId,
          storageLocationId: line.storageLocationId,
          qty: formatQty(line.deltaQty),
          kind: "ADJUSTMENT",
          occurredAt,
          userId: input.userId,
          sourceKind: "ADJUSTMENT",
          sourceId: id,
          condition: "SELLABLE",
          notes: "Carry-forward stock",
        });
      }

      db.prepare(
        `UPDATE StockAdjustment
         SET status = 'POSTED', postedByUserId = ?, postedAt = ?, updatedAt = ?
         WHERE id = ?`,
      ).run(input.userId, nowIso(), nowIso(), id);

      return adjustmentNo;
    })();

    return { ok: true, saved: deltas.length, adjustmentNo: result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to post carry-forward stock.",
    };
  }
}
