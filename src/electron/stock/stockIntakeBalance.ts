import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { StockCondition } from "../../shared/stock.types.js";
import { formatQty, parseQty } from "./decimal.js";
import { applyMovement } from "./post.js";
import {
  getAllIntakePoolProductIds,
  getPalmKernelLandingProductId,
  getPalmKernelMemberProductIds,
  getPalmKernelPoolProductId,
  getSludgeLandingProductId,
  getSludgeMemberProductIds,
  getSludgeOilPoolProductId,
} from "./stockIntakeMigration.js";

const QTY_EPS = 0.000001;

interface BalanceRow {
  salesPointId: number;
  productId: number;
  storageLocationId: number | null;
  condition: StockCondition;
  qty: string;
}

function loadMemberBalances(db: Database.Database, memberIds: number[]): BalanceRow[] {
  if (memberIds.length === 0) {
    return [];
  }
  const placeholders = memberIds.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT salesPointId, productId, storageLocationId, condition, qty
       FROM StockBalance
       WHERE productId IN (${placeholders})
         AND CAST(qty AS REAL) > ?`,
    )
    .all(...memberIds, QTY_EPS) as BalanceRow[];
}

function loadPoolBalances(db: Database.Database, poolId: number): BalanceRow[] {
  return db
    .prepare(
      `SELECT salesPointId, productId, storageLocationId, condition, qty
       FROM StockBalance
       WHERE productId = ?
         AND CAST(qty AS REAL) > ?`,
    )
    .all(poolId, QTY_EPS) as BalanceRow[];
}

function poolBalanceKey(row: BalanceRow): string {
  return `${row.salesPointId}:${row.storageLocationId ?? "null"}:${row.condition}`;
}

function consolidatePoolBalances(
  db: Database.Database,
  userId: string,
  poolId: number,
  memberIds: number[],
  notes: string,
): void {
  if (memberIds.length === 0) {
    return;
  }

  const sourceId = randomUUID();
  const occurredAt = new Date().toISOString();
  const memberBalances = loadMemberBalances(db, memberIds);
  const poolTotals = new Map<string, number>();

  for (const row of memberBalances) {
    const qty = parseQty(row.qty);
    if (qty <= QTY_EPS) {
      continue;
    }

    applyMovement(db, {
      salesPointId: row.salesPointId,
      productId: row.productId,
      storageLocationId: row.storageLocationId,
      condition: row.condition,
      qty: formatQty(-qty),
      kind: "ADJUSTMENT",
      occurredAt,
      userId,
      sourceKind: "STOCK_INTAKE_GROUPING",
      sourceId,
      notes,
    });

    const key = poolBalanceKey(row);
    poolTotals.set(key, (poolTotals.get(key) ?? 0) + qty);
  }

  for (const [key, qty] of poolTotals) {
    const [salesPointId, locationToken, condition] = key.split(":");
    applyMovement(db, {
      salesPointId: Number.parseInt(salesPointId, 10),
      productId: poolId,
      storageLocationId:
        locationToken === "null" ? null : Number.parseInt(locationToken, 10),
      condition: condition as StockCondition,
      qty: formatQty(qty),
      kind: "ADJUSTMENT",
      occurredAt,
      userId,
      sourceKind: "STOCK_INTAKE_GROUPING",
      sourceId,
      notes,
    });
  }
}

function splitPoolToLandingProduct(
  db: Database.Database,
  userId: string,
  poolId: number,
  landingId: number,
  notes: string,
): void {
  const sourceId = randomUUID();
  const occurredAt = new Date().toISOString();
  const poolBalances = loadPoolBalances(db, poolId);

  for (const row of poolBalances) {
    const qty = parseQty(row.qty);
    if (qty <= QTY_EPS) {
      continue;
    }

    applyMovement(db, {
      salesPointId: row.salesPointId,
      productId: poolId,
      storageLocationId: row.storageLocationId,
      condition: row.condition,
      qty: formatQty(-qty),
      kind: "ADJUSTMENT",
      occurredAt,
      userId,
      sourceKind: "STOCK_INTAKE_GROUPING",
      sourceId,
      notes: `${notes} (from pool)`,
    });

    applyMovement(db, {
      salesPointId: row.salesPointId,
      productId: landingId,
      storageLocationId: row.storageLocationId,
      condition: row.condition,
      qty: formatQty(qty),
      kind: "ADJUSTMENT",
      occurredAt,
      userId,
      sourceKind: "STOCK_INTAKE_GROUPING",
      sourceId,
      notes,
    });
  }
}

/** Move member balances into their intake pool products. */
export function consolidateIntakePoolBalances(
  db: Database.Database,
  userId: string,
): void {
  const sludgePoolId = getSludgeOilPoolProductId(db);
  if (sludgePoolId != null) {
    consolidatePoolBalances(
      db,
      userId,
      sludgePoolId,
      getSludgeMemberProductIds(db),
      "Consolidate sludge grades into Sludge Oil pool",
    );
  }

  const palmKernelPoolId = getPalmKernelPoolProductId(db);
  if (palmKernelPoolId != null) {
    consolidatePoolBalances(
      db,
      userId,
      palmKernelPoolId,
      getPalmKernelMemberProductIds(db),
      "Consolidate cracked/uncracked into Palm Kernel pool",
    );
  }
}

/** Move pool balances back to landing products when grouping is disabled. */
export function splitIntakePoolBalancesToLandingProducts(
  db: Database.Database,
  userId: string,
): void {
  const sludgePoolId = getSludgeOilPoolProductId(db);
  const sludgeLandingId = getSludgeLandingProductId(db);
  if (sludgePoolId != null && sludgeLandingId != null) {
    splitPoolToLandingProduct(
      db,
      userId,
      sludgePoolId,
      sludgeLandingId,
      "Return Sludge Oil pool stock to Bottom Tank Oil Grade A",
    );
  }

  const palmKernelPoolId = getPalmKernelPoolProductId(db);
  const palmKernelLandingId = getPalmKernelLandingProductId(db);
  if (palmKernelPoolId != null && palmKernelLandingId != null) {
    splitPoolToLandingProduct(
      db,
      userId,
      palmKernelPoolId,
      palmKernelLandingId,
      "Return Palm Kernel pool stock to Cracked Palm Kernel",
    );
  }
}

/** @deprecated Use consolidateIntakePoolBalances */
export function consolidateSludgeOilBalances(
  db: Database.Database,
  userId: string,
): void {
  consolidateIntakePoolBalances(db, userId);
}

/** @deprecated Use splitIntakePoolBalancesToLandingProducts */
export function splitSludgeOilBalancesToLandingGrade(
  db: Database.Database,
  userId: string,
): void {
  splitIntakePoolBalancesToLandingProducts(db, userId);
}

export function getSludgeOilPoolTotalQty(db: Database.Database): number {
  const poolId = getSludgeOilPoolProductId(db);
  if (poolId == null) {
    return 0;
  }
  return getPoolTotalQty(db, poolId);
}

export function getIntakePoolTotalQty(db: Database.Database): number {
  const poolIds = getAllIntakePoolProductIds(db);
  if (poolIds.length === 0) {
    return 0;
  }
  const placeholders = poolIds.map(() => "?").join(", ");
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CAST(qty AS REAL)), 0) AS totalQty
       FROM StockBalance
       WHERE productId IN (${placeholders})`,
    )
    .get(...poolIds) as { totalQty: number };
  return Number(row?.totalQty ?? 0);
}

function getPoolTotalQty(db: Database.Database, poolId: number): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CAST(qty AS REAL)), 0) AS totalQty
       FROM StockBalance
       WHERE productId = ?`,
    )
    .get(poolId) as { totalQty: number };
  return Number(row?.totalQty ?? 0);
}
