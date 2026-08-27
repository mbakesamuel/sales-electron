import type {
  StockReceiveQueuePage,
  StockReceiveQueueRow,
  StorageLocationOption,
} from "../../shared/stock.types.js";
import { canReceiveStockTransfers } from "../../shared/roles.js";
import {
  assertAction,
} from "../auth/permissions/service.js";
import { getDatabase } from "../db/index.js";
import { formatQty } from "./decimal.js";
import { loadStockTransferReceiveUsesDocumentDate } from "./documentNumberSettings.js";

const QUEUE_LIMIT = 200;

function getActor(userId: string): {
  id: string;
  role: string;
  salesPointId: number | null;
  isActive: number;
} {
  const row = getDatabase()
    .prepare(`SELECT id, role, salesPointId, isActive FROM User WHERE id = ?`)
    .get(userId) as
    | { id: string; role: string; salesPointId: number | null; isActive: number }
    | undefined;

  if (!row?.isActive) {
    throw new Error("Login required.");
  }

  return row;
}

function assertCanListReceiveQueue(role: string): void {
  if (!canReceiveStockTransfers(role)) {
    throw new Error("You do not have permission to receive stock transfers.");
  }
}

/**
 * Pending inter-site bottled transfers dispatched to the actor's collection point.
 */
export function listReceiveQueue(userId: string): StockReceiveQueuePage {
  const actor = getActor(userId);
  assertAction(actor.role, "receive_stock_transfers");
  assertCanListReceiveQueue(actor.role);

  const db = getDatabase();
  const scoped = actor.salesPointId;
  if (scoped == null && actor.role !== "ADMIN") {
    throw new Error(
      "Your user must be assigned to a collection point to receive transfers.",
    );
  }

  const bottledLineExists = `EXISTS (
    SELECT 1 FROM StockTransferLine tl
    JOIN Product tp ON tp.productId = tl.productId
    LEFT JOIN ProductCat tpc ON tpc.productCatId = tp.productCatId
    WHERE tl.transferId = t.id AND COALESCE(tpc.isBottled, 0) = 1
  )`;

  const rowsRaw = scoped
    ? (db
        .prepare(
          `SELECT t.id, t.transferNo, t.fromSalesPointId, fsp.name AS fromSalesPointName,
                  t.toSalesPointId, tsp.name AS toSalesPointName, t.dispatchedAt,
                  cu.name AS createdByName, du.name AS dispatchedByName,
                  (SELECT COUNT(*) FROM StockTransferLine tl WHERE tl.transferId = t.id) AS lineCount,
                  (SELECT COALESCE(SUM(tl.qty), 0) FROM StockTransferLine tl WHERE tl.transferId = t.id) AS totalQty
           FROM StockTransfer t
           JOIN SalesPoint fsp ON fsp.id = t.fromSalesPointId
           JOIN SalesPoint tsp ON tsp.id = t.toSalesPointId
           JOIN User cu ON cu.id = t.createdByUserId
           LEFT JOIN User du ON du.id = t.dispatchedByUserId
           WHERE t.status = 'DISPATCHED'
             AND t.toSalesPointId = ?
             AND t.fromSalesPointId != t.toSalesPointId
             AND ${bottledLineExists}
           ORDER BY t.dispatchedAt DESC, t.createdAt DESC
           LIMIT ?`,
        )
        .all(scoped, QUEUE_LIMIT) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT t.id, t.transferNo, t.fromSalesPointId, fsp.name AS fromSalesPointName,
                  t.toSalesPointId, tsp.name AS toSalesPointName, t.dispatchedAt,
                  cu.name AS createdByName, du.name AS dispatchedByName,
                  (SELECT COUNT(*) FROM StockTransferLine tl WHERE tl.transferId = t.id) AS lineCount,
                  (SELECT COALESCE(SUM(tl.qty), 0) FROM StockTransferLine tl WHERE tl.transferId = t.id) AS totalQty
           FROM StockTransfer t
           JOIN SalesPoint fsp ON fsp.id = t.fromSalesPointId
           JOIN SalesPoint tsp ON tsp.id = t.toSalesPointId
           JOIN User cu ON cu.id = t.createdByUserId
           LEFT JOIN User du ON du.id = t.dispatchedByUserId
           WHERE t.status = 'DISPATCHED'
             AND t.fromSalesPointId != t.toSalesPointId
             AND ${bottledLineExists}
           ORDER BY t.dispatchedAt DESC, t.createdAt DESC
           LIMIT ?`,
        )
        .all(QUEUE_LIMIT) as Array<Record<string, unknown>>);

  const rows: StockReceiveQueueRow[] = rowsRaw.map((row) => ({
    id: String(row.id),
    transferNo: String(row.transferNo),
    fromSalesPointId: Number(row.fromSalesPointId),
    fromSalesPointName: String(row.fromSalesPointName),
    toSalesPointId: Number(row.toSalesPointId),
    toSalesPointName: String(row.toSalesPointName),
    dispatchedAtIso: row.dispatchedAt ? String(row.dispatchedAt) : null,
    totalQty: formatQty(Number(row.totalQty) || 0),
    lineCount: Number(row.lineCount) || 0,
    createdByName: String(row.createdByName),
    dispatchedByName: row.dispatchedByName
      ? String(row.dispatchedByName)
      : null,
  }));

  const storageLocations = db
    .prepare(
      `SELECT sl.id, sl.salesPointId, l.locationName AS name, sl.isDefault,
              COALESCE(sl.isSalesTank, 0) AS isSalesTank
       FROM StorageLocation sl
       JOIN Location l ON l.id = sl.locationId
       WHERE sl.salesPointId IS NOT NULL
       ORDER BY sl.salesPointId ASC, l.locationName ASC`,
    )
    .all()
    .map((row) => ({
      id: (row as { id: number }).id,
      salesPointId: (row as { salesPointId: number }).salesPointId,
      name: (row as { name: string }).name,
      isDefault: (row as { isDefault: number }).isDefault === 1,
      isSalesTank: (row as { isSalesTank: number }).isSalesTank === 1,
    })) as StorageLocationOption[];

  return {
    rows,
    storageLocations,
    transferReceiveUsesDocumentDate: loadStockTransferReceiveUsesDocumentDate(),
    scopedSalesPointId: scoped,
  };
}
