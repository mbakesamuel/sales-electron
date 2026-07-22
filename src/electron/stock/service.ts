import { randomUUID } from "node:crypto";
import type {
  AdjustmentDetail,
  AdjustmentListRow,
  AdjustmentReviewResult,
  ReceiptDetail,
  ReceiptListRow,
  ReceiptReviewResult,
  ReceiveTransferInput,
  SaveAdjustmentInput,
  SaveReceiptInput,
  SaveTransferInput,
  StockBootstrap,
  StockGenericResult,
  StockMovementKind,
  StockMovementRow,
  StockMutationResult,
  TransferDetail,
  TransferListRow,
  TransferReviewResult,
} from "../../shared/stock.types.js";
import {
  isIntraSalesPointTransfer,
  resolveTransferMode,
  type TransferMode,
} from "../../shared/stockTransferMode.js";
import {
  assertRouteWrite,
  canAccessRoute,
  canWriteRoute,
} from "../auth/permissions/service.js";
import { getDatabase } from "../db/index.js";
import { absQty, formatQty, isNonZeroQty, isPositiveQty, parseQty, sumQty } from "./decimal.js";
import { isInsufficientStockError } from "./errors.js";
import {
  applyMovement,
  assertStorageLocationForSalesPoint,
  assertTransferLinesAvailableAtSource,
  movementSignedDelta,
  reverseMovementsBySource,
} from "./post.js";
import {
  allocateAdjustmentNo,
  allocateReceiptNo,
  allocateTransferNo,
} from "./sequences.js";

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function normalizeIsoDateInput(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return new Date().toISOString().slice(0, 10);
}

function noonUtcIsoDate(isoDate: string): string {
  return `${isoDate}T12:00:00`;
}

function utcIsoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function describeError(error: unknown, fallback: string): string {
  if (isInsufficientStockError(error)) {
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}

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

function scopedSalesPointIdForActor(actor: { salesPointId: number | null }): number | null {
  return actor.salesPointId ?? null;
}

function assertSalesPointScope(
  actor: { salesPointId: number | null },
  salesPointId: number,
): void {
  if (actor.salesPointId != null && actor.salesPointId !== salesPointId) {
    throw new Error("You can only work within your assigned sales point.");
  }
}

function canDraftStockDocuments(role: string, hasWrite: boolean): boolean {
  if (!hasWrite) {
    return false;
  }
  return role !== "MANAGER" && role !== "STATISTICS_SUPERVISOR";
}

function uomForBottled(isBottled: boolean, uom: string | null): string {
  if (uom?.trim()) {
    return uom.trim();
  }
  return isBottled ? "Unit" : "Kg";
}

function assertStockWrite(role: string, routeId: string): void {
  assertRouteWrite(role, routeId);
}

export function getStockBootstrap(userId: string): StockBootstrap {
  const actor = getActor(userId);
  const role = actor.role;
  const db = getDatabase();
  const scopedSalesPointId = scopedSalesPointIdForActor(actor);

  const canWriteReceipts = canWriteRoute(role, "stock-receipts");
  const canWriteTransfers = canWriteRoute(role, "stock-transfers");
  const canWriteAdjustments = canWriteRoute(role, "stock-adjustments");

  const salesPoints = db
    .prepare(`SELECT id, name FROM SalesPoint ORDER BY name ASC`)
    .all() as StockBootstrap["salesPoints"];

  const storageLocations = db
    .prepare(
      `SELECT sl.id, sl.salesPointId, l.locationName AS name, sl.isDefault, sl.isSellable
       FROM StorageLocation sl
       JOIN Location l ON l.id = sl.locationId
       ORDER BY sl.salesPointId ASC, l.locationName ASC`,
    )
    .all()
    .map((row) => ({
      id: (row as { id: number }).id,
      salesPointId: (row as { salesPointId: number }).salesPointId,
      name: (row as { name: string }).name,
      isDefault: (row as { isDefault: number }).isDefault === 1,
      isSellable: (row as { isSellable: number }).isSellable === 1,
    }));

  const products = db
    .prepare(
      `SELECT p.productId, p.productName, p.uom, COALESCE(pc.isBottled, 0) AS isBottled
       FROM Product p
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       ORDER BY p.productName ASC`,
    )
    .all()
    .map((row) => {
      const product = row as {
        productId: number;
        productName: string;
        uom: string | null;
        isBottled: number;
      };
      const isBottled = product.isBottled === 1;
      return {
        productId: product.productId,
        productName: product.productName,
        isBottled,
        uom: uomForBottled(isBottled, product.uom),
      };
    });

  return {
    canManageReceipts: canWriteReceipts,
    canDispatchTransfers: canWriteTransfers,
    canReceiveTransfers: canWriteTransfers,
    canPostAdjustments: canWriteAdjustments,
    canReclassifyStock: canWriteAdjustments,
    canCancelDocuments:
      canWriteReceipts || canWriteTransfers || canWriteAdjustments,
    canDraftReceipts: canDraftStockDocuments(role, canWriteReceipts),
    canDraftTransfers: canDraftStockDocuments(role, canWriteTransfers),
    canDraftAdjustments: canDraftStockDocuments(role, canWriteAdjustments),
    scopedSalesPointId,
    salesPoints,
    storageLocations,
    products,
    onHand: loadOnHand(scopedSalesPointId),
    movements: loadMovements(scopedSalesPointId),
    receipts: loadReceipts(scopedSalesPointId),
    transfers: loadTransfers(scopedSalesPointId),
    adjustments: loadAdjustments(scopedSalesPointId),
  };
}

function loadOnHand(scopedSalesPointId: number | null) {
  const db = getDatabase();
  const rows = scopedSalesPointId
    ? (db
        .prepare(
          `SELECT sb.salesPointId, sp.name AS salesPointName, sb.storageLocationId,
                  l.locationName AS storageLocationName, sb.productId, p.productName,
                  p.uom, COALESCE(pc.isBottled, 0) AS isBottled, sb.condition, sb.qty
           FROM StockBalance sb
           JOIN SalesPoint sp ON sp.id = sb.salesPointId
           JOIN StorageLocation sl ON sl.id = sb.storageLocationId
           JOIN Location l ON l.id = sl.locationId
           JOIN Product p ON p.productId = sb.productId
           LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
           WHERE sb.salesPointId = ?
           ORDER BY sp.name ASC, l.locationName ASC, p.productName ASC`,
        )
        .all(scopedSalesPointId) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT sb.salesPointId, sp.name AS salesPointName, sb.storageLocationId,
                  l.locationName AS storageLocationName, sb.productId, p.productName,
                  p.uom, COALESCE(pc.isBottled, 0) AS isBottled, sb.condition, sb.qty
           FROM StockBalance sb
           JOIN SalesPoint sp ON sp.id = sb.salesPointId
           JOIN StorageLocation sl ON sl.id = sb.storageLocationId
           JOIN Location l ON l.id = sl.locationId
           JOIN Product p ON p.productId = sb.productId
           LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
           ORDER BY sp.name ASC, l.locationName ASC, p.productName ASC`,
        )
        .all() as Array<Record<string, unknown>>);

  return rows.map((row) => ({
    salesPointId: row.salesPointId as number,
    salesPointName: row.salesPointName as string,
    storageLocationId: row.storageLocationId as number,
    storageLocationName: row.storageLocationName as string,
    productId: row.productId as number,
    productName: row.productName as string,
    uom: uomForBottled((row.isBottled as number) === 1, row.uom as string | null),
    condition: row.condition as "SELLABLE" | "UNSELLABLE",
    qty: String(row.qty),
  }));
}

function loadMovements(scopedSalesPointId: number | null): StockMovementRow[] {
  const db = getDatabase();
  const rows = scopedSalesPointId
    ? (db
        .prepare(
          `SELECT sm.id, sm.occurredAt, sm.salesPointId, sp.name AS salesPointName,
                  sm.storageLocationId, l.locationName AS storageLocationName,
                  sm.productId, p.productName, p.uom, COALESCE(pc.isBottled, 0) AS isBottled,
                  sm.kind, sm.condition, sm.qty, sm.sourceKind, sm.sourceId,
                  sm.userId, u.name AS userName, sm.notes, sm.createdAt
           FROM StockMovement sm
           JOIN SalesPoint sp ON sp.id = sm.salesPointId
           JOIN StorageLocation sl ON sl.id = sm.storageLocationId
           JOIN Location l ON l.id = sl.locationId
           JOIN Product p ON p.productId = sm.productId
           LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
           JOIN User u ON u.id = sm.userId
           WHERE sm.salesPointId = ?
           ORDER BY sm.occurredAt DESC, sm.createdAt DESC
           LIMIT 200`,
        )
        .all(scopedSalesPointId) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT sm.id, sm.occurredAt, sm.salesPointId, sp.name AS salesPointName,
                  sm.storageLocationId, l.locationName AS storageLocationName,
                  sm.productId, p.productName, p.uom, COALESCE(pc.isBottled, 0) AS isBottled,
                  sm.kind, sm.condition, sm.qty, sm.sourceKind, sm.sourceId,
                  sm.userId, u.name AS userName, sm.notes, sm.createdAt
           FROM StockMovement sm
           JOIN SalesPoint sp ON sp.id = sm.salesPointId
           JOIN StorageLocation sl ON sl.id = sm.storageLocationId
           JOIN Location l ON l.id = sl.locationId
           JOIN Product p ON p.productId = sm.productId
           LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
           JOIN User u ON u.id = sm.userId
           ORDER BY sm.occurredAt DESC, sm.createdAt DESC
           LIMIT 200`,
        )
        .all() as Array<Record<string, unknown>>);

  const docNoByKey = new Map<string, string>();
  const carryForwardByKey = new Map<string, boolean>();
  for (const row of rows) {
    const key = `${row.sourceKind}:${row.sourceId}`;
    if (docNoByKey.has(key)) {
      continue;
    }
    const sourceKind = String(row.sourceKind);
    const sourceId = String(row.sourceId);
    if (sourceKind === "RECEIPT") {
      const receipt = db
        .prepare(`SELECT receiptNo FROM StockReceipt WHERE id = ?`)
        .get(sourceId) as { receiptNo: string } | undefined;
      if (receipt) docNoByKey.set(key, receipt.receiptNo);
    } else if (sourceKind === "TRANSFER") {
      const transfer = db
        .prepare(`SELECT transferNo FROM StockTransfer WHERE id = ?`)
        .get(sourceId) as { transferNo: string } | undefined;
      if (transfer) docNoByKey.set(key, transfer.transferNo);
    } else if (sourceKind === "SALE") {
      const sale = db
        .prepare(`SELECT invoiceNo FROM Sale WHERE id = ?`)
        .get(sourceId) as { invoiceNo: string } | undefined;
      if (sale) docNoByKey.set(key, sale.invoiceNo);
    } else if (sourceKind === "ADJUSTMENT") {
      const adjustment = db
        .prepare(
          `SELECT adjustmentNo, COALESCE(sourceKind, 'NORMAL') AS sourceKind
           FROM StockAdjustment WHERE id = ?`,
        )
        .get(sourceId) as { adjustmentNo: string; sourceKind: string } | undefined;
      if (adjustment) {
        docNoByKey.set(key, adjustment.adjustmentNo);
        carryForwardByKey.set(key, adjustment.sourceKind === "CARRY_FORWARD");
      }
    }
  }

  return rows.map((row) => ({
    id: String(row.id),
    occurredAtIso: String(row.occurredAt),
    salesPointId: row.salesPointId as number,
    salesPointName: row.salesPointName as string,
    storageLocationId: row.storageLocationId as number,
    storageLocationName: row.storageLocationName as string,
    productId: row.productId as number,
    productName: row.productName as string,
    uom: uomForBottled((row.isBottled as number) === 1, row.uom as string | null),
    kind: row.kind as StockMovementKind,
    condition: row.condition as "SELLABLE" | "UNSELLABLE",
    qty: String(row.qty),
    signedQty: movementSignedDelta(row.kind as StockMovementKind, String(row.qty)),
    sourceKind: String(row.sourceKind),
    sourceId: String(row.sourceId),
    documentNo: docNoByKey.get(`${row.sourceKind}:${row.sourceId}`) ?? null,
    userId: String(row.userId),
    userName: row.userName as string,
    notes: row.notes ? String(row.notes) : null,
    createdAtIso: String(row.createdAt),
    isCarryForward:
      carryForwardByKey.get(`${row.sourceKind}:${row.sourceId}`) === true,
  }));
}

function loadReceipts(scopedSalesPointId: number | null): ReceiptListRow[] {
  const db = getDatabase();
  const rows = scopedSalesPointId
    ? (db
        .prepare(
          `SELECT r.id, r.receiptNo, r.salesPointId, sp.name AS salesPointName,
                  r.receivedAt, r.supplierLabel, r.status, r.postedAt, r.createdAt,
                  cu.name AS createdByName, pu.name AS postedByName
           FROM StockReceipt r
           JOIN SalesPoint sp ON sp.id = r.salesPointId
           JOIN User cu ON cu.id = r.createdByUserId
           LEFT JOIN User pu ON pu.id = r.postedByUserId
           WHERE r.salesPointId = ?
           ORDER BY r.receivedAt DESC, r.createdAt DESC
           LIMIT 100`,
        )
        .all(scopedSalesPointId) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT r.id, r.receiptNo, r.salesPointId, sp.name AS salesPointName,
                  r.receivedAt, r.supplierLabel, r.status, r.postedAt, r.createdAt,
                  cu.name AS createdByName, pu.name AS postedByName
           FROM StockReceipt r
           JOIN SalesPoint sp ON sp.id = r.salesPointId
           JOIN User cu ON cu.id = r.createdByUserId
           LEFT JOIN User pu ON pu.id = r.postedByUserId
           ORDER BY r.receivedAt DESC, r.createdAt DESC
           LIMIT 100`,
        )
        .all() as Array<Record<string, unknown>>);

  return rows.map((row) => {
    const lines = db
      .prepare(`SELECT qty FROM StockReceiptLine WHERE receiptId = ?`)
      .all(String(row.id)) as Array<{ qty: string }>;
    return {
      id: String(row.id),
      receiptNo: String(row.receiptNo),
      salesPointId: row.salesPointId as number,
      salesPointName: row.salesPointName as string,
      receivedAtIso: String(row.receivedAt).slice(0, 10),
      supplierLabel: String(row.supplierLabel),
      status: row.status as ReceiptListRow["status"],
      totalQty: sumQty(lines.map((line) => line.qty)),
      lineCount: lines.length,
      createdByName: row.createdByName as string,
      postedByName: (row.postedByName as string | null) ?? null,
      postedAtIso: row.postedAt ? String(row.postedAt) : null,
      createdAtIso: String(row.createdAt),
    };
  });
}

function transferLocationSummary(
  db: ReturnType<typeof getDatabase>,
  transferId: string,
  transferMode: TransferMode,
): string | null {
  if (transferMode !== "INTRA_SALES_POINT") {
    return null;
  }

  const line = db
    .prepare(
      `SELECT fl.locationName AS fromName, tl.locationName AS toName
       FROM StockTransferLine l
       JOIN StorageLocation fsl ON fsl.id = l.fromStorageLocationId
       JOIN Location fl ON fl.id = fsl.locationId
       LEFT JOIN StorageLocation tsl ON tsl.id = l.toStorageLocationId
       LEFT JOIN Location tl ON tl.id = tsl.locationId
       WHERE l.transferId = ?
       ORDER BY l.id ASC
       LIMIT 1`,
    )
    .get(transferId) as { fromName: string; toName: string | null } | undefined;

  if (!line) {
    return null;
  }
  if (!line.toName) {
    return line.fromName;
  }
  return `${line.fromName} → ${line.toName}`;
}

function loadTransfers(scopedSalesPointId: number | null): TransferListRow[] {
  const db = getDatabase();
  const rows = scopedSalesPointId
    ? (db
        .prepare(
          `SELECT t.id, t.transferNo, t.fromSalesPointId, fsp.name AS fromSalesPointName,
                  t.toSalesPointId, tsp.name AS toSalesPointName, t.dispatchedAt, t.receivedAt,
                  t.status, t.createdAt, cu.name AS createdByName, du.name AS dispatchedByName,
                  ru.name AS receivedByName
           FROM StockTransfer t
           JOIN SalesPoint fsp ON fsp.id = t.fromSalesPointId
           JOIN SalesPoint tsp ON tsp.id = t.toSalesPointId
           JOIN User cu ON cu.id = t.createdByUserId
           LEFT JOIN User du ON du.id = t.dispatchedByUserId
           LEFT JOIN User ru ON ru.id = t.receivedByUserId
           WHERE t.fromSalesPointId = ? OR t.toSalesPointId = ?
           ORDER BY t.createdAt DESC
           LIMIT 100`,
        )
        .all(scopedSalesPointId, scopedSalesPointId) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT t.id, t.transferNo, t.fromSalesPointId, fsp.name AS fromSalesPointName,
                  t.toSalesPointId, tsp.name AS toSalesPointName, t.dispatchedAt, t.receivedAt,
                  t.status, t.createdAt, cu.name AS createdByName, du.name AS dispatchedByName,
                  ru.name AS receivedByName
           FROM StockTransfer t
           JOIN SalesPoint fsp ON fsp.id = t.fromSalesPointId
           JOIN SalesPoint tsp ON tsp.id = t.toSalesPointId
           JOIN User cu ON cu.id = t.createdByUserId
           LEFT JOIN User du ON du.id = t.dispatchedByUserId
           LEFT JOIN User ru ON ru.id = t.receivedByUserId
           ORDER BY t.createdAt DESC
           LIMIT 100`,
        )
        .all() as Array<Record<string, unknown>>);

  return rows.map((row) => {
    const lines = db
      .prepare(`SELECT qty FROM StockTransferLine WHERE transferId = ?`)
      .all(String(row.id)) as Array<{ qty: string }>;
    const fromSalesPointId = row.fromSalesPointId as number;
    const toSalesPointId = row.toSalesPointId as number;
    const transferMode = resolveTransferMode(fromSalesPointId, toSalesPointId);
    const transferId = String(row.id);
    return {
      id: transferId,
      transferNo: String(row.transferNo),
      transferMode,
      locationSummary: transferLocationSummary(db, transferId, transferMode),
      fromSalesPointId,
      fromSalesPointName: row.fromSalesPointName as string,
      toSalesPointId,
      toSalesPointName: row.toSalesPointName as string,
      dispatchedAtIso: row.dispatchedAt ? String(row.dispatchedAt).slice(0, 10) : null,
      receivedAtIso: row.receivedAt ? String(row.receivedAt).slice(0, 10) : null,
      status: row.status as TransferListRow["status"],
      totalQty: sumQty(lines.map((line) => line.qty)),
      lineCount: lines.length,
      createdByName: row.createdByName as string,
      dispatchedByName: (row.dispatchedByName as string | null) ?? null,
      receivedByName: (row.receivedByName as string | null) ?? null,
      createdAtIso: String(row.createdAt),
    };
  });
}

function loadAdjustments(scopedSalesPointId: number | null): AdjustmentListRow[] {
  const db = getDatabase();
  const rows = scopedSalesPointId
    ? (db
        .prepare(
          `SELECT a.id, a.adjustmentNo, a.salesPointId, sp.name AS salesPointName,
                  a.occurredAt, a.reason, a.status, COALESCE(a.sourceKind, 'NORMAL') AS sourceKind,
                  a.postedAt, a.createdAt,
                  cu.name AS createdByName, pu.name AS postedByName
           FROM StockAdjustment a
           JOIN SalesPoint sp ON sp.id = a.salesPointId
           JOIN User cu ON cu.id = a.createdByUserId
           LEFT JOIN User pu ON pu.id = a.postedByUserId
           WHERE a.salesPointId = ?
           ORDER BY a.occurredAt DESC, a.createdAt DESC
           LIMIT 100`,
        )
        .all(scopedSalesPointId) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT a.id, a.adjustmentNo, a.salesPointId, sp.name AS salesPointName,
                  a.occurredAt, a.reason, a.status, COALESCE(a.sourceKind, 'NORMAL') AS sourceKind,
                  a.postedAt, a.createdAt,
                  cu.name AS createdByName, pu.name AS postedByName
           FROM StockAdjustment a
           JOIN SalesPoint sp ON sp.id = a.salesPointId
           JOIN User cu ON cu.id = a.createdByUserId
           LEFT JOIN User pu ON pu.id = a.postedByUserId
           ORDER BY a.occurredAt DESC, a.createdAt DESC
           LIMIT 100`,
        )
        .all() as Array<Record<string, unknown>>);

  return rows.map((row) => {
    const lineCount = (
      db
        .prepare(`SELECT COUNT(*) AS count FROM StockAdjustmentLine WHERE adjustmentId = ?`)
        .get(String(row.id)) as { count: number }
    ).count;
    return {
      id: String(row.id),
      adjustmentNo: String(row.adjustmentNo),
      salesPointId: row.salesPointId as number,
      salesPointName: row.salesPointName as string,
      occurredAtIso: String(row.occurredAt).slice(0, 10),
      reason: String(row.reason),
      status: row.status as AdjustmentListRow["status"],
      sourceKind:
        String(row.sourceKind) === "CARRY_FORWARD" ? "CARRY_FORWARD" : "NORMAL",
      lineCount,
      createdByName: row.createdByName as string,
      postedByName: (row.postedByName as string | null) ?? null,
      postedAtIso: row.postedAt ? String(row.postedAt) : null,
      createdAtIso: String(row.createdAt),
    };
  });
}

export function loadReceiptDetail(id: string, userId: string): ReceiptDetail | null {
  const actor = getActor(userId);
  const scopedSalesPointId = scopedSalesPointIdForActor(actor);
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT r.id, r.receiptNo, r.salesPointId, sp.name AS salesPointName,
              r.receivedAt, r.supplierLabel, r.status, r.notes, r.postedAt, r.createdAt,
              cu.name AS createdByName, pu.name AS postedByName
       FROM StockReceipt r
       JOIN SalesPoint sp ON sp.id = r.salesPointId
       JOIN User cu ON cu.id = r.createdByUserId
       LEFT JOIN User pu ON pu.id = r.postedByUserId
       WHERE r.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }
  if (scopedSalesPointId != null && row.salesPointId !== scopedSalesPointId) {
    return null;
  }

  const lines = db
    .prepare(
      `SELECT l.id, l.productId, p.productName, p.uom, COALESCE(pc.isBottled, 0) AS isBottled,
              l.qty, l.storageLocationId, loc.locationName AS storageLocationName
       FROM StockReceiptLine l
       JOIN Product p ON p.productId = l.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       JOIN StorageLocation sl ON sl.id = l.storageLocationId
       JOIN Location loc ON loc.id = sl.locationId
       WHERE l.receiptId = ?
       ORDER BY l.id ASC`,
    )
    .all(id) as Array<Record<string, unknown>>;

  return {
    id: String(row.id),
    receiptNo: String(row.receiptNo),
    salesPointId: row.salesPointId as number,
    salesPointName: row.salesPointName as string,
    receivedAtIso: String(row.receivedAt).slice(0, 10),
    supplierLabel: String(row.supplierLabel),
    status: row.status as ReceiptDetail["status"],
    totalQty: sumQty(lines.map((line) => String(line.qty))),
    lineCount: lines.length,
    createdByName: row.createdByName as string,
    postedByName: (row.postedByName as string | null) ?? null,
    postedAtIso: row.postedAt ? String(row.postedAt) : null,
    createdAtIso: String(row.createdAt),
    notes: row.notes ? String(row.notes) : null,
    lines: lines.map((line) => ({
      id: String(line.id),
      productId: line.productId as number,
      productName: line.productName as string,
      uom: uomForBottled((line.isBottled as number) === 1, line.uom as string | null),
      qty: String(line.qty),
      storageLocationId: line.storageLocationId as number,
      storageLocationName: line.storageLocationName as string,
    })),
  };
}

export function loadTransferDetail(id: string, userId: string): TransferDetail | null {
  const actor = getActor(userId);
  const scopedSalesPointId = scopedSalesPointIdForActor(actor);
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT t.id, t.transferNo, t.fromSalesPointId, fsp.name AS fromSalesPointName,
              t.toSalesPointId, tsp.name AS toSalesPointName, t.dispatchedAt, t.receivedAt,
              t.status, t.notes, t.createdAt, cu.name AS createdByName,
              du.name AS dispatchedByName, ru.name AS receivedByName
       FROM StockTransfer t
       JOIN SalesPoint fsp ON fsp.id = t.fromSalesPointId
       JOIN SalesPoint tsp ON tsp.id = t.toSalesPointId
       JOIN User cu ON cu.id = t.createdByUserId
       LEFT JOIN User du ON du.id = t.dispatchedByUserId
       LEFT JOIN User ru ON ru.id = t.receivedByUserId
       WHERE t.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }
  if (
    scopedSalesPointId != null &&
    row.fromSalesPointId !== scopedSalesPointId &&
    row.toSalesPointId !== scopedSalesPointId
  ) {
    return null;
  }

  const lines = db
    .prepare(
      `SELECT l.id, l.productId, p.productName, p.uom, COALESCE(pc.isBottled, 0) AS isBottled,
              l.qty, l.fromStorageLocationId, fl.locationName AS fromStorageLocationName,
              l.toStorageLocationId, tl.locationName AS toStorageLocationName
       FROM StockTransferLine l
       JOIN Product p ON p.productId = l.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       JOIN StorageLocation fsl ON fsl.id = l.fromStorageLocationId
       JOIN Location fl ON fl.id = fsl.locationId
       LEFT JOIN StorageLocation tsl ON tsl.id = l.toStorageLocationId
       LEFT JOIN Location tl ON tl.id = tsl.locationId
       WHERE l.transferId = ?
       ORDER BY l.id ASC`,
    )
    .all(id) as Array<Record<string, unknown>>;

  const fromSalesPointId = row.fromSalesPointId as number;
  const toSalesPointId = row.toSalesPointId as number;
  const transferMode = resolveTransferMode(fromSalesPointId, toSalesPointId);

  return {
    id: String(row.id),
    transferNo: String(row.transferNo),
    transferMode,
    locationSummary: transferLocationSummary(db, id, transferMode),
    fromSalesPointId,
    fromSalesPointName: row.fromSalesPointName as string,
    toSalesPointId,
    toSalesPointName: row.toSalesPointName as string,
    dispatchedAtIso: row.dispatchedAt ? String(row.dispatchedAt).slice(0, 10) : null,
    receivedAtIso: row.receivedAt ? String(row.receivedAt).slice(0, 10) : null,
    status: row.status as TransferDetail["status"],
    totalQty: sumQty(lines.map((line) => String(line.qty))),
    lineCount: lines.length,
    createdByName: row.createdByName as string,
    dispatchedByName: (row.dispatchedByName as string | null) ?? null,
    receivedByName: (row.receivedByName as string | null) ?? null,
    createdAtIso: String(row.createdAt),
    notes: row.notes ? String(row.notes) : null,
    lines: lines.map((line) => ({
      id: String(line.id),
      productId: line.productId as number,
      productName: line.productName as string,
      uom: uomForBottled((line.isBottled as number) === 1, line.uom as string | null),
      qty: String(line.qty),
      fromStorageLocationId: line.fromStorageLocationId as number,
      fromStorageLocationName: line.fromStorageLocationName as string,
      toStorageLocationId: (line.toStorageLocationId as number | null) ?? null,
      toStorageLocationName: (line.toStorageLocationName as string | null) ?? null,
    })),
  };
}

export function saveReceipt(input: SaveReceiptInput): StockMutationResult {
  try {
    const actor = getActor(input.userId);
    assertStockWrite(actor.role, "stock-receipts");
    assertSalesPointScope(actor, input.salesPointId);

    if (!input.supplierLabel.trim()) {
      return { ok: false, error: "Supplier label is required." };
    }
    if (input.lines.length === 0) {
      return { ok: false, error: "Add at least one line." };
    }

    const db = getDatabase();
    const receivedAt = noonUtcIsoDate(normalizeIsoDateInput(input.receivedAt));
    const lines = input.lines.map((line) => {
      if (!isPositiveQty(line.qty)) {
        throw new Error("Each line quantity must be greater than zero.");
      }
      return line;
    });

    const tx = db.transaction(() => {
      for (const line of lines) {
        assertStorageLocationForSalesPoint(db, input.salesPointId, line.storageLocationId);
      }

      if (input.id) {
        const existing = db
          .prepare(`SELECT id, status, salesPointId FROM StockReceipt WHERE id = ?`)
          .get(input.id) as { id: string; status: string; salesPointId: number } | undefined;
        if (!existing) {
          throw new Error("Receipt not found.");
        }
        assertSalesPointScope(actor, existing.salesPointId);
        if (existing.status !== "DRAFT") {
          throw new Error("Only draft receipts can be edited.");
        }

        db.prepare(`DELETE FROM StockReceiptLine WHERE receiptId = ?`).run(input.id);
        db.prepare(
          `UPDATE StockReceipt
           SET salesPointId = ?, receivedAt = ?, supplierLabel = ?, notes = ?, updatedAt = datetime('now')
           WHERE id = ?`,
        ).run(
          input.salesPointId,
          receivedAt,
          input.supplierLabel.trim(),
          input.notes?.trim() || null,
          input.id,
        );

        const insertLine = db.prepare(
          `INSERT INTO StockReceiptLine (id, receiptId, productId, qty, storageLocationId)
           VALUES (?, ?, ?, ?, ?)`,
        );
        for (const line of lines) {
          insertLine.run(
            randomUUID(),
            input.id,
            line.productId,
            formatQty(parseQty(line.qty)),
            line.storageLocationId,
          );
        }

        const updated = db
          .prepare(`SELECT id, receiptNo FROM StockReceipt WHERE id = ?`)
          .get(input.id) as { id: string; receiptNo: string };
        return updated;
      }

      const id = randomUUID();
      const receiptNo = allocateReceiptNo(db, receivedAt);
      db.prepare(
        `INSERT INTO StockReceipt (
          id, receiptNo, salesPointId, receivedAt, supplierLabel, status, notes, createdByUserId
        ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?)`,
      ).run(
        id,
        receiptNo,
        input.salesPointId,
        receivedAt,
        input.supplierLabel.trim(),
        input.notes?.trim() || null,
        input.userId,
      );

      const insertLine = db.prepare(
        `INSERT INTO StockReceiptLine (id, receiptId, productId, qty, storageLocationId)
         VALUES (?, ?, ?, ?, ?)`,
      );
      for (const line of lines) {
        insertLine.run(
          randomUUID(),
          id,
          line.productId,
          formatQty(parseQty(line.qty)),
          line.storageLocationId,
        );
      }

      return { id, receiptNo };
    });

    const result = tx();
    return { ok: true, id: result.id, documentNo: result.receiptNo };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not save receipt.") };
  }
}

export function postReceipt(userId: string, receiptId: string): StockGenericResult {
  try {
    const actor = getActor(userId);
    assertStockWrite(actor.role, "stock-receipts");
    const db = getDatabase();

    const tx = db.transaction(() => {
      const existing = db
        .prepare(`SELECT * FROM StockReceipt WHERE id = ?`)
        .get(receiptId) as Record<string, unknown> | undefined;
      if (!existing) {
        throw new Error("Receipt not found.");
      }
      assertSalesPointScope(actor, existing.salesPointId as number);
      if (existing.status === "POSTED") {
        return;
      }
      if (existing.status !== "DRAFT") {
        throw new Error(`Cannot post a receipt in status ${String(existing.status)}.`);
      }

      const lines = db
        .prepare(`SELECT * FROM StockReceiptLine WHERE receiptId = ?`)
        .all(receiptId) as Array<Record<string, unknown>>;
      if (lines.length === 0) {
        throw new Error("Add at least one line before posting.");
      }

      for (const line of lines) {
        applyMovement(db, {
          salesPointId: existing.salesPointId as number,
          productId: line.productId as number,
          storageLocationId: line.storageLocationId as number,
          qty: String(line.qty),
          kind: "RECEIPT",
          occurredAt: String(existing.receivedAt),
          userId,
          sourceKind: "RECEIPT",
          sourceId: receiptId,
        });
      }

      db.prepare(
        `UPDATE StockReceipt
         SET status = 'POSTED', postedByUserId = ?, postedAt = datetime('now'), updatedAt = datetime('now')
         WHERE id = ?`,
      ).run(userId, receiptId);
    });

    tx();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not post receipt.") };
  }
}

export function cancelReceipt(userId: string, receiptId: string): StockGenericResult {
  return cancelStockDocument(userId, "RECEIPT", receiptId);
}

export function saveTransfer(input: SaveTransferInput): StockMutationResult {
  try {
    const actor = getActor(input.userId);
    assertStockWrite(actor.role, "stock-transfers");
    assertSalesPointScope(actor, input.fromSalesPointId);

    const isIntra = isIntraSalesPointTransfer(
      input.fromSalesPointId,
      input.toSalesPointId,
    );
    if (!isIntra && input.fromSalesPointId === input.toSalesPointId) {
      return { ok: false, error: "Source and destination must differ." };
    }
    if (input.lines.length === 0) {
      return { ok: false, error: "Add at least one line." };
    }

    const db = getDatabase();
    const dispatchedAt = noonUtcIsoDate(normalizeIsoDateInput(input.dispatchedAt));
    const lines = input.lines.map((line) => {
      if (!isPositiveQty(line.qty)) {
        throw new Error("Each line quantity must be greater than zero.");
      }
      if (isIntra) {
        if (line.toStorageLocationId == null) {
          throw new Error("Each line needs a destination storage location.");
        }
        if (line.fromStorageLocationId === line.toStorageLocationId) {
          throw new Error("Source and destination locations must differ on each line.");
        }
      }
      return line;
    });

    const tx = db.transaction(() => {
      for (const line of lines) {
        assertStorageLocationForSalesPoint(
          db,
          input.fromSalesPointId,
          line.fromStorageLocationId,
        );
        if (isIntra && line.toStorageLocationId != null) {
          assertStorageLocationForSalesPoint(
            db,
            input.fromSalesPointId,
            line.toStorageLocationId,
          );
        }
      }
      if (!isIntra) {
        assertTransferLinesAvailableAtSource(db, input.fromSalesPointId, lines);
      }

      const insertLine = isIntra
        ? db.prepare(
            `INSERT INTO StockTransferLine (
              id, transferId, productId, qty, fromStorageLocationId, toStorageLocationId
            ) VALUES (?, ?, ?, ?, ?, ?)`,
          )
        : db.prepare(
            `INSERT INTO StockTransferLine (id, transferId, productId, qty, fromStorageLocationId)
             VALUES (?, ?, ?, ?, ?)`,
          );

      if (input.id) {
        const existing = db
          .prepare(`SELECT id, status, fromSalesPointId FROM StockTransfer WHERE id = ?`)
          .get(input.id) as { id: string; status: string; fromSalesPointId: number } | undefined;
        if (!existing) {
          throw new Error("Transfer not found.");
        }
        assertSalesPointScope(actor, existing.fromSalesPointId);
        if (existing.status !== "DRAFT") {
          throw new Error("Only draft transfers can be edited.");
        }

        db.prepare(`DELETE FROM StockTransferLine WHERE transferId = ?`).run(input.id);
        db.prepare(
          `UPDATE StockTransfer
           SET fromSalesPointId = ?, toSalesPointId = ?, dispatchedAt = ?, notes = ?, updatedAt = datetime('now')
           WHERE id = ?`,
        ).run(
          input.fromSalesPointId,
          input.toSalesPointId,
          dispatchedAt,
          input.notes?.trim() || null,
          input.id,
        );

        for (const line of lines) {
          if (isIntra) {
            insertLine.run(
              randomUUID(),
              input.id,
              line.productId,
              formatQty(parseQty(line.qty)),
              line.fromStorageLocationId,
              line.toStorageLocationId!,
            );
          } else {
            insertLine.run(
              randomUUID(),
              input.id,
              line.productId,
              formatQty(parseQty(line.qty)),
              line.fromStorageLocationId,
            );
          }
        }

        const updated = db
          .prepare(`SELECT id, transferNo FROM StockTransfer WHERE id = ?`)
          .get(input.id) as { id: string; transferNo: string };
        return updated;
      }

      const id = randomUUID();
      const transferNo = allocateTransferNo(db, dispatchedAt);
      db.prepare(
        `INSERT INTO StockTransfer (
          id, transferNo, fromSalesPointId, toSalesPointId, dispatchedAt, status, notes, createdByUserId
        ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?)`,
      ).run(
        id,
        transferNo,
        input.fromSalesPointId,
        input.toSalesPointId,
        dispatchedAt,
        input.notes?.trim() || null,
        input.userId,
      );

      for (const line of lines) {
        if (isIntra) {
          insertLine.run(
            randomUUID(),
            id,
            line.productId,
            formatQty(parseQty(line.qty)),
            line.fromStorageLocationId,
            line.toStorageLocationId!,
          );
        } else {
          insertLine.run(
            randomUUID(),
            id,
            line.productId,
            formatQty(parseQty(line.qty)),
            line.fromStorageLocationId,
          );
        }
      }

      return { id, transferNo };
    });

    const result = tx();
    return { ok: true, id: result.id, documentNo: result.transferNo };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not save transfer.") };
  }
}

export function postInternalTransfer(userId: string, transferId: string): StockGenericResult {
  try {
    const actor = getActor(userId);
    assertStockWrite(actor.role, "stock-transfers");
    const db = getDatabase();

    const tx = db.transaction(() => {
      const existing = db
        .prepare(`SELECT * FROM StockTransfer WHERE id = ?`)
        .get(transferId) as Record<string, unknown> | undefined;
      if (!existing) {
        throw new Error("Transfer not found.");
      }

      const fromSalesPointId = existing.fromSalesPointId as number;
      const toSalesPointId = existing.toSalesPointId as number;
      if (!isIntraSalesPointTransfer(fromSalesPointId, toSalesPointId)) {
        throw new Error("Only location moves within a sales point can be posted.");
      }

      assertSalesPointScope(actor, fromSalesPointId);
      if (existing.status === "POSTED") {
        return;
      }
      if (existing.status !== "DRAFT") {
        throw new Error(`Cannot post a transfer in status ${String(existing.status)}.`);
      }

      const lines = db
        .prepare(`SELECT * FROM StockTransferLine WHERE transferId = ?`)
        .all(transferId) as Array<Record<string, unknown>>;
      if (lines.length === 0) {
        throw new Error("Add at least one line before posting.");
      }

      for (const line of lines) {
        if (line.toStorageLocationId == null) {
          throw new Error("Each line needs a destination storage location.");
        }
      }

      assertTransferLinesAvailableAtSource(
        db,
        fromSalesPointId,
        lines.map((line) => ({
          productId: line.productId as number,
          qty: String(line.qty),
          fromStorageLocationId: line.fromStorageLocationId as number,
        })),
      );

      const postedAt = existing.dispatchedAt ? String(existing.dispatchedAt) : nowIso();
      for (const line of lines) {
        applyMovement(db, {
          salesPointId: fromSalesPointId,
          productId: line.productId as number,
          storageLocationId: line.fromStorageLocationId as number,
          qty: String(line.qty),
          kind: "TRANSFER_OUT",
          occurredAt: postedAt,
          userId,
          sourceKind: "TRANSFER",
          sourceId: transferId,
        });
        applyMovement(db, {
          salesPointId: fromSalesPointId,
          productId: line.productId as number,
          storageLocationId: line.toStorageLocationId as number,
          qty: String(line.qty),
          kind: "TRANSFER_IN",
          occurredAt: postedAt,
          userId,
          sourceKind: "TRANSFER",
          sourceId: transferId,
        });
      }

      db.prepare(
        `UPDATE StockTransfer
         SET status = 'POSTED', dispatchedAt = ?, receivedAt = ?,
             dispatchedByUserId = ?, receivedByUserId = ?, updatedAt = datetime('now')
         WHERE id = ?`,
      ).run(postedAt, postedAt, userId, userId, transferId);
    });

    tx();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not post location move.") };
  }
}

export function dispatchTransfer(userId: string, transferId: string): StockGenericResult {
  try {
    const actor = getActor(userId);
    assertStockWrite(actor.role, "stock-transfers");
    const db = getDatabase();

    const tx = db.transaction(() => {
      const existing = db
        .prepare(`SELECT * FROM StockTransfer WHERE id = ?`)
        .get(transferId) as Record<string, unknown> | undefined;
      if (!existing) {
        throw new Error("Transfer not found.");
      }
      if (
        isIntraSalesPointTransfer(
          existing.fromSalesPointId as number,
          existing.toSalesPointId as number,
        )
      ) {
        throw new Error("Use Post for location moves within a sales point.");
      }
      assertSalesPointScope(actor, existing.fromSalesPointId as number);
      if (existing.status === "DISPATCHED" || existing.status === "RECEIVED") {
        return;
      }
      if (existing.status !== "DRAFT") {
        throw new Error(`Cannot dispatch a transfer in status ${String(existing.status)}.`);
      }

      const lines = db
        .prepare(`SELECT * FROM StockTransferLine WHERE transferId = ?`)
        .all(transferId) as Array<Record<string, unknown>>;
      if (lines.length === 0) {
        throw new Error("Add at least one line before dispatching.");
      }

      const dispatchedAt = existing.dispatchedAt
        ? String(existing.dispatchedAt)
        : nowIso();
      for (const line of lines) {
        applyMovement(db, {
          salesPointId: existing.fromSalesPointId as number,
          productId: line.productId as number,
          storageLocationId: line.fromStorageLocationId as number,
          qty: String(line.qty),
          kind: "TRANSFER_OUT",
          occurredAt: dispatchedAt,
          userId,
          sourceKind: "TRANSFER",
          sourceId: transferId,
        });
      }

      db.prepare(
        `UPDATE StockTransfer
         SET status = 'DISPATCHED', dispatchedAt = ?, dispatchedByUserId = ?, updatedAt = datetime('now')
         WHERE id = ?`,
      ).run(dispatchedAt, userId, transferId);
    });

    tx();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not dispatch transfer.") };
  }
}

export function receiveTransfer(input: ReceiveTransferInput): StockGenericResult {
  try {
    const actor = getActor(input.userId);
    assertStockWrite(actor.role, "stock-transfers");
    const db = getDatabase();

    const tx = db.transaction(() => {
      const existing = db
        .prepare(`SELECT * FROM StockTransfer WHERE id = ?`)
        .get(input.transferId) as Record<string, unknown> | undefined;
      if (!existing) {
        throw new Error("Transfer not found.");
      }
      if (
        isIntraSalesPointTransfer(
          existing.fromSalesPointId as number,
          existing.toSalesPointId as number,
        )
      ) {
        throw new Error("Use Post for location moves within a sales point.");
      }
      assertSalesPointScope(actor, existing.toSalesPointId as number);
      if (existing.status === "RECEIVED") {
        return;
      }
      if (existing.status !== "DISPATCHED") {
        throw new Error("Only dispatched transfers can be received.");
      }

      const lines = db
        .prepare(`SELECT * FROM StockTransferLine WHERE transferId = ?`)
        .all(input.transferId) as Array<Record<string, unknown>>;
      if (input.lines.length !== lines.length) {
        throw new Error("Assign a receive location for every line.");
      }

      const lineById = new Map(lines.map((line) => [String(line.id), line]));
      for (const receiveLine of input.lines) {
        if (!lineById.has(receiveLine.lineId)) {
          throw new Error("One or more lines do not belong to this transfer.");
        }
        assertStorageLocationForSalesPoint(
          db,
          existing.toSalesPointId as number,
          receiveLine.toStorageLocationId,
        );
      }

      const receivedAt = nowIso();
      for (const receiveLine of input.lines) {
        const line = lineById.get(receiveLine.lineId)!;
        db.prepare(
          `UPDATE StockTransferLine SET toStorageLocationId = ? WHERE id = ?`,
        ).run(receiveLine.toStorageLocationId, receiveLine.lineId);
        applyMovement(db, {
          salesPointId: existing.toSalesPointId as number,
          productId: line.productId as number,
          storageLocationId: receiveLine.toStorageLocationId,
          qty: String(line.qty),
          kind: "TRANSFER_IN",
          occurredAt: receivedAt,
          userId: input.userId,
          sourceKind: "TRANSFER",
          sourceId: input.transferId,
        });
      }

      db.prepare(
        `UPDATE StockTransfer
         SET status = 'RECEIVED', receivedAt = ?, receivedByUserId = ?, updatedAt = datetime('now')
         WHERE id = ?`,
      ).run(receivedAt, input.userId, input.transferId);
    });

    tx();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not receive transfer.") };
  }
}

export function cancelTransfer(userId: string, transferId: string): StockGenericResult {
  return cancelStockDocument(userId, "TRANSFER", transferId);
}

export function saveAdjustment(input: SaveAdjustmentInput): StockMutationResult {
  try {
    const actor = getActor(input.userId);
    assertStockWrite(actor.role, "stock-adjustments");
    assertSalesPointScope(actor, input.salesPointId);

    if (!input.reason.trim()) {
      return { ok: false, error: "Reason is required." };
    }
    if (input.lines.length === 0) {
      return { ok: false, error: "Add at least one adjustment line." };
    }

    const db = getDatabase();
    const occurredAt = noonUtcIsoDate(normalizeIsoDateInput(input.occurredAt));
    const lines = input.lines.map((line) => {
      if (!isNonZeroQty(line.deltaQty)) {
        throw new Error("Each adjustment line must be non-zero.");
      }
      if (
        (line.fromCondition && !line.toCondition) ||
        (!line.fromCondition && line.toCondition)
      ) {
        throw new Error("Reclassification lines must specify both fromCondition and toCondition.");
      }
      if (line.fromCondition && line.toCondition && line.fromCondition === line.toCondition) {
        throw new Error("Reclassification must change between sellable and unsellable.");
      }
      if (line.fromCondition && line.toCondition && !isPositiveQty(line.deltaQty)) {
        throw new Error("Reclassification quantity must be greater than zero.");
      }
      return line;
    });

    const tx = db.transaction(() => {
      for (const line of lines) {
        assertStorageLocationForSalesPoint(db, input.salesPointId, line.storageLocationId);
      }

      if (input.id) {
        const existing = db
          .prepare(`SELECT id, status, salesPointId FROM StockAdjustment WHERE id = ?`)
          .get(input.id) as { id: string; status: string; salesPointId: number } | undefined;
        if (!existing) {
          throw new Error("Adjustment not found.");
        }
        assertSalesPointScope(actor, existing.salesPointId);
        if (existing.status !== "DRAFT") {
          throw new Error("Only draft adjustments can be edited.");
        }

        db.prepare(`DELETE FROM StockAdjustmentLine WHERE adjustmentId = ?`).run(input.id);
        db.prepare(
          `UPDATE StockAdjustment
           SET salesPointId = ?, occurredAt = ?, reason = ?, updatedAt = datetime('now')
           WHERE id = ?`,
        ).run(input.salesPointId, occurredAt, input.reason.trim(), input.id);

        const insertLine = db.prepare(
          `INSERT INTO StockAdjustmentLine (
            id, adjustmentId, productId, deltaQty, storageLocationId, fromCondition, toCondition
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        );
        for (const line of lines) {
          insertLine.run(
            randomUUID(),
            input.id,
            line.productId,
            formatQty(parseQty(line.deltaQty)),
            line.storageLocationId,
            line.fromCondition ?? null,
            line.toCondition ?? null,
          );
        }

        const updated = db
          .prepare(`SELECT id, adjustmentNo FROM StockAdjustment WHERE id = ?`)
          .get(input.id) as { id: string; adjustmentNo: string };
        return updated;
      }

      const id = randomUUID();
      const adjustmentNo = allocateAdjustmentNo(db, occurredAt);
      db.prepare(
        `INSERT INTO StockAdjustment (
          id, adjustmentNo, salesPointId, occurredAt, reason, status, createdByUserId
        ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)`,
      ).run(id, adjustmentNo, input.salesPointId, occurredAt, input.reason.trim(), input.userId);

      const insertLine = db.prepare(
        `INSERT INTO StockAdjustmentLine (
          id, adjustmentId, productId, deltaQty, storageLocationId, fromCondition, toCondition
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const line of lines) {
        insertLine.run(
          randomUUID(),
          id,
          line.productId,
          formatQty(parseQty(line.deltaQty)),
          line.storageLocationId,
          line.fromCondition ?? null,
          line.toCondition ?? null,
        );
      }

      return { id, adjustmentNo };
    });

    const result = tx();
    return { ok: true, id: result.id, documentNo: result.adjustmentNo };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not save adjustment.") };
  }
}

export function postAdjustment(userId: string, adjustmentId: string): StockGenericResult {
  try {
    const actor = getActor(userId);
    assertStockWrite(actor.role, "stock-adjustments");
    const db = getDatabase();

    const tx = db.transaction(() => {
      const existing = db
        .prepare(`SELECT * FROM StockAdjustment WHERE id = ?`)
        .get(adjustmentId) as Record<string, unknown> | undefined;
      if (!existing) {
        throw new Error("Adjustment not found.");
      }
      assertSalesPointScope(actor, existing.salesPointId as number);
      if (existing.status === "POSTED") {
        return;
      }
      if (existing.status !== "DRAFT") {
        throw new Error(`Cannot post an adjustment in status ${String(existing.status)}.`);
      }

      const lines = db
        .prepare(`SELECT * FROM StockAdjustmentLine WHERE adjustmentId = ?`)
        .all(adjustmentId) as Array<Record<string, unknown>>;
      if (lines.length === 0) {
        throw new Error("Add at least one line before posting.");
      }

      const isCarryForward = String(existing.sourceKind ?? "NORMAL") === "CARRY_FORWARD";
      const adjustmentNotes = isCarryForward ? "Carry-forward stock" : undefined;

      for (const line of lines) {
        if (line.fromCondition && line.toCondition) {
          const qty = absQty(String(line.deltaQty));
          applyMovement(db, {
            salesPointId: existing.salesPointId as number,
            productId: line.productId as number,
            storageLocationId: line.storageLocationId as number,
            condition: line.fromCondition as "SELLABLE" | "UNSELLABLE",
            qty: formatQty(-parseQty(qty)),
            kind: "ADJUSTMENT",
            occurredAt: String(existing.occurredAt),
            userId,
            sourceKind: "ADJUSTMENT",
            sourceId: adjustmentId,
            notes: `Reclassify ${String(line.fromCondition)} -> ${String(line.toCondition)}`,
          });
          applyMovement(db, {
            salesPointId: existing.salesPointId as number,
            productId: line.productId as number,
            storageLocationId: line.storageLocationId as number,
            condition: line.toCondition as "SELLABLE" | "UNSELLABLE",
            qty,
            kind: "ADJUSTMENT",
            occurredAt: String(existing.occurredAt),
            userId,
            sourceKind: "ADJUSTMENT",
            sourceId: adjustmentId,
            notes: `Reclassify ${String(line.fromCondition)} -> ${String(line.toCondition)}`,
          });
        } else {
          applyMovement(db, {
            salesPointId: existing.salesPointId as number,
            productId: line.productId as number,
            storageLocationId: line.storageLocationId as number,
            qty: String(line.deltaQty),
            kind: "ADJUSTMENT",
            occurredAt: String(existing.occurredAt),
            userId,
            sourceKind: "ADJUSTMENT",
            sourceId: adjustmentId,
            ...(adjustmentNotes ? { notes: adjustmentNotes } : {}),
          });
        }
      }

      db.prepare(
        `UPDATE StockAdjustment
         SET status = 'POSTED', postedByUserId = ?, postedAt = datetime('now'), updatedAt = datetime('now')
         WHERE id = ?`,
      ).run(userId, adjustmentId);
    });

    tx();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not post adjustment.") };
  }
}

export function cancelAdjustment(userId: string, adjustmentId: string): StockGenericResult {
  return cancelStockDocument(userId, "ADJUSTMENT", adjustmentId);
}

function cancelStockDocument(
  userId: string,
  kind: "RECEIPT" | "TRANSFER" | "ADJUSTMENT",
  documentId: string,
): StockGenericResult {
  try {
    const actor = getActor(userId);
    const routeId =
      kind === "RECEIPT"
        ? "stock-receipts"
        : kind === "TRANSFER"
          ? "stock-transfers"
          : "stock-adjustments";
    assertStockWrite(actor.role, routeId);
    const db = getDatabase();

    const tx = db.transaction(() => {
      if (kind === "RECEIPT") {
        const existing = db
          .prepare(`SELECT id, status, salesPointId FROM StockReceipt WHERE id = ?`)
          .get(documentId) as { id: string; status: string; salesPointId: number } | undefined;
        if (!existing) {
          throw new Error("Receipt not found.");
        }
        assertSalesPointScope(actor, existing.salesPointId);
        if (existing.status === "DRAFT") {
          db.prepare(`DELETE FROM StockReceipt WHERE id = ?`).run(documentId);
          return;
        }
        if (existing.status === "CANCELLED") {
          return;
        }
        reverseMovementsBySource(db, {
          sourceKind: "RECEIPT",
          sourceId: documentId,
          userId,
          occurredAt: nowIso(),
          notes: `Cancellation of receipt ${documentId}`,
        });
        db.prepare(`UPDATE StockReceipt SET status = 'CANCELLED', updatedAt = datetime('now') WHERE id = ?`).run(
          documentId,
        );
        return;
      }

      if (kind === "TRANSFER") {
        const existing = db
          .prepare(`SELECT id, status, fromSalesPointId FROM StockTransfer WHERE id = ?`)
          .get(documentId) as { id: string; status: string; fromSalesPointId: number } | undefined;
        if (!existing) {
          throw new Error("Transfer not found.");
        }
        assertSalesPointScope(actor, existing.fromSalesPointId);
        if (existing.status === "DRAFT") {
          db.prepare(`DELETE FROM StockTransfer WHERE id = ?`).run(documentId);
          return;
        }
        if (existing.status === "CANCELLED") {
          return;
        }
        reverseMovementsBySource(db, {
          sourceKind: "TRANSFER",
          sourceId: documentId,
          userId,
          occurredAt: nowIso(),
          notes: `Cancellation of transfer ${documentId}`,
        });
        db.prepare(`UPDATE StockTransfer SET status = 'CANCELLED', updatedAt = datetime('now') WHERE id = ?`).run(
          documentId,
        );
        return;
      }

      const existing = db
        .prepare(`SELECT id, status, salesPointId FROM StockAdjustment WHERE id = ?`)
        .get(documentId) as { id: string; status: string; salesPointId: number } | undefined;
      if (!existing) {
        throw new Error("Adjustment not found.");
      }
      assertSalesPointScope(actor, existing.salesPointId);
      if (existing.status === "DRAFT") {
        db.prepare(`DELETE FROM StockAdjustment WHERE id = ?`).run(documentId);
        return;
      }
      if (existing.status === "CANCELLED") {
        return;
      }
      reverseMovementsBySource(db, {
        sourceKind: "ADJUSTMENT",
        sourceId: documentId,
        userId,
        occurredAt: nowIso(),
        notes: `Cancellation of adjustment ${documentId}`,
      });
      db.prepare(`UPDATE StockAdjustment SET status = 'CANCELLED', updatedAt = datetime('now') WHERE id = ?`).run(
        documentId,
      );
    });

    tx();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not cancel document.") };
  }
}

export function findReceiptByNumber(userId: string, receiptNo: string): ReceiptReviewResult {
  try {
    const actor = getActor(userId);
    if (!canAccessRoute(actor.role, "stock-receipts")) {
      throw new Error("You do not have permission to view receipts.");
    }
    const trimmed = String(receiptNo ?? "").trim().toUpperCase();
    if (!trimmed) {
      return { ok: false, error: "Enter a receipt number." };
    }
    const row = getDatabase()
      .prepare(`SELECT id FROM StockReceipt WHERE receiptNo = ?`)
      .get(trimmed) as { id: string } | undefined;
    if (!row) {
      return { ok: false, error: `Receipt "${trimmed}" not found.` };
    }
    const detail = loadReceiptDetail(row.id, userId);
    if (!detail) {
      return { ok: false, error: `Receipt "${trimmed}" is not visible to your sales point.` };
    }
    return { ok: true, detail };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not load receipt.") };
  }
}

export function findTransferByNumber(userId: string, transferNo: string): TransferReviewResult {
  try {
    const actor = getActor(userId);
    if (!canAccessRoute(actor.role, "stock-transfers")) {
      throw new Error("You do not have permission to view transfers.");
    }
    const trimmed = String(transferNo ?? "").trim().toUpperCase();
    if (!trimmed) {
      return { ok: false, error: "Enter a transfer number." };
    }
    const row = getDatabase()
      .prepare(`SELECT id FROM StockTransfer WHERE transferNo = ?`)
      .get(trimmed) as { id: string } | undefined;
    if (!row) {
      return { ok: false, error: `Transfer "${trimmed}" not found.` };
    }
    const detail = loadTransferDetail(row.id, userId);
    if (!detail) {
      return { ok: false, error: `Transfer "${trimmed}" is not visible to your sales point.` };
    }
    return { ok: true, detail };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not load transfer.") };
  }
}

export function loadReceiptForReview(userId: string, receiptId: string): ReceiptReviewResult {
  try {
    const detail = loadReceiptDetail(receiptId, userId);
    if (!detail) {
      return { ok: false, error: "Receipt not found." };
    }
    return { ok: true, detail };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not load receipt.") };
  }
}

export function loadTransferForReview(userId: string, transferId: string): TransferReviewResult {
  try {
    const detail = loadTransferDetail(transferId, userId);
    if (!detail) {
      return { ok: false, error: "Transfer not found." };
    }
    return { ok: true, detail };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not load transfer.") };
  }
}

export function loadAdjustmentDetail(id: string, userId: string): AdjustmentDetail | null {
  const actor = getActor(userId);
  const scopedSalesPointId = scopedSalesPointIdForActor(actor);
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT a.id, a.adjustmentNo, a.salesPointId, sp.name AS salesPointName,
              a.occurredAt, a.reason, a.status, COALESCE(a.sourceKind, 'NORMAL') AS sourceKind,
              a.postedAt, a.createdAt,
              cu.name AS createdByName, pu.name AS postedByName
       FROM StockAdjustment a
       JOIN SalesPoint sp ON sp.id = a.salesPointId
       JOIN User cu ON cu.id = a.createdByUserId
       LEFT JOIN User pu ON pu.id = a.postedByUserId
       WHERE a.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }
  if (scopedSalesPointId != null && row.salesPointId !== scopedSalesPointId) {
    return null;
  }

  const lines = db
    .prepare(
      `SELECT l.id, l.productId, p.productName, p.uom, COALESCE(pc.isBottled, 0) AS isBottled,
              l.deltaQty, l.storageLocationId, loc.locationName AS storageLocationName,
              l.fromCondition, l.toCondition
       FROM StockAdjustmentLine l
       JOIN Product p ON p.productId = l.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       JOIN StorageLocation sl ON sl.id = l.storageLocationId
       JOIN Location loc ON loc.id = sl.locationId
       WHERE l.adjustmentId = ?
       ORDER BY l.id ASC`,
    )
    .all(id) as Array<Record<string, unknown>>;

  return {
    id: String(row.id),
    adjustmentNo: String(row.adjustmentNo),
    salesPointId: row.salesPointId as number,
    salesPointName: row.salesPointName as string,
    occurredAtIso: String(row.occurredAt).slice(0, 10),
    reason: String(row.reason),
    status: row.status as AdjustmentDetail["status"],
    sourceKind:
      String(row.sourceKind) === "CARRY_FORWARD" ? "CARRY_FORWARD" : "NORMAL",
    lineCount: lines.length,
    createdByName: row.createdByName as string,
    postedByName: (row.postedByName as string | null) ?? null,
    postedAtIso: row.postedAt ? String(row.postedAt) : null,
    createdAtIso: String(row.createdAt),
    lines: lines.map((line) => ({
      id: String(line.id),
      productId: line.productId as number,
      productName: line.productName as string,
      uom: uomForBottled((line.isBottled as number) === 1, line.uom as string | null),
      deltaQty: String(line.deltaQty),
      storageLocationId: line.storageLocationId as number,
      storageLocationName: line.storageLocationName as string,
      fromCondition: (line.fromCondition as AdjustmentDetail["lines"][number]["fromCondition"]) ?? null,
      toCondition: (line.toCondition as AdjustmentDetail["lines"][number]["toCondition"]) ?? null,
    })),
  };
}

export function findAdjustmentByNumber(
  userId: string,
  adjustmentNo: string,
): AdjustmentReviewResult {
  try {
    const actor = getActor(userId);
    if (!canAccessRoute(actor.role, "stock-adjustments")) {
      throw new Error("You do not have permission to view adjustments.");
    }
    const trimmed = String(adjustmentNo ?? "").trim().toUpperCase();
    if (!trimmed) {
      return { ok: false, error: "Enter an adjustment number." };
    }
    const row = getDatabase()
      .prepare(`SELECT id FROM StockAdjustment WHERE adjustmentNo = ?`)
      .get(trimmed) as { id: string } | undefined;
    if (!row) {
      return { ok: false, error: `Adjustment "${trimmed}" not found.` };
    }
    const detail = loadAdjustmentDetail(row.id, userId);
    if (!detail) {
      return {
        ok: false,
        error: `Adjustment "${trimmed}" is not visible to your sales point.`,
      };
    }
    return { ok: true, detail };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not load adjustment.") };
  }
}

export function loadAdjustmentForReview(
  userId: string,
  adjustmentId: string,
): AdjustmentReviewResult {
  try {
    const detail = loadAdjustmentDetail(adjustmentId, userId);
    if (!detail) {
      return { ok: false, error: "Adjustment not found." };
    }
    return { ok: true, detail };
  } catch (error) {
    return { ok: false, error: describeError(error, "Could not load adjustment.") };
  }
}

export { utcIsoDateToday };
