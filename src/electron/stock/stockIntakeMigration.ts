import type Database from "better-sqlite3";
import {
  LOOSE_PALM_OIL_PRODUCT_NAME,
  PALM_KERNEL_MEMBER_PRODUCT_NAMES,
  PALM_KERNEL_POOL_PRODUCT_NAME,
  SLUDGE_MEMBER_PRODUCT_NAMES,
  SLUDGE_OIL_POOL_PRODUCT_NAME,
} from "../../shared/stockIntakeGroups.js";

function findProductByName(db: Database.Database, name: string): number | null {
  const row = db
    .prepare(
      `SELECT productId FROM Product
       WHERE LOWER(TRIM(productName)) = LOWER(TRIM(?))
       LIMIT 1`,
    )
    .get(name) as { productId: number } | undefined;
  return row?.productId ?? null;
}

function findMemberIds(db: Database.Database, names: readonly string[]): number[] {
  const ids: number[] = [];
  for (const name of names) {
    const id = findProductByName(db, name);
    if (id != null) {
      ids.push(id);
    }
  }
  return ids;
}

function defaultCommercialServiceId(db: Database.Database): string | null {
  const row = db
    .prepare(`SELECT id FROM CommercialService ORDER BY id ASC LIMIT 1`)
    .get() as { id: string } | undefined;
  return row?.id ?? null;
}

function defaultProductCatId(db: Database.Database, memberIds: number[]): number | null {
  if (memberIds.length === 0) {
    const row = db
      .prepare(
        `SELECT productCatId FROM ProductCat
         WHERE COALESCE(isBottled, 0) = 0
         ORDER BY productCatId ASC
         LIMIT 1`,
      )
      .get() as { productCatId: number } | undefined;
    return row?.productCatId ?? null;
  }

  const row = db
    .prepare(
      `SELECT productCatId FROM Product
       WHERE productId = ?
       LIMIT 1`,
    )
    .get(memberIds[0]) as { productCatId: number } | undefined;
  return row?.productCatId ?? null;
}

function productHasOmitsStorageLocationColumn(db: Database.Database): boolean {
  const columns = db
    .prepare(`PRAGMA table_info(Product)`)
    .all() as Array<{ name: string }>;
  return columns.some((column) => column.name === "omitsStorageLocation");
}

function ensurePoolProduct(
  db: Database.Database,
  poolName: string,
  productCode: string,
  stockIntakeGroup: "SLUDGE_OIL" | "PALM_KERNEL",
  memberIds: number[],
): number | null {
  let poolId = findProductByName(db, poolName);
  const poolOmitsStorageLocation =
    stockIntakeGroup === "PALM_KERNEL" && productHasOmitsStorageLocationColumn(db);

  if (poolId == null) {
    const productCatId = defaultProductCatId(db, memberIds);
    const commercialServiceId = defaultCommercialServiceId(db);
    if (productCatId == null) {
      return null;
    }

    const result = poolOmitsStorageLocation
      ? db
          .prepare(
            `INSERT INTO Product (
               productName, productCode, productCatId, commercialServiceId, uom,
               stockIntakeGroup, excludeFromSales, omitsStorageLocation
             ) VALUES (?, ?, ?, ?, 'Kg', ?, 1, 1)`,
          )
          .run(
            poolName,
            productCode,
            productCatId,
            commercialServiceId,
            stockIntakeGroup,
          )
      : db
          .prepare(
            `INSERT INTO Product (
               productName, productCode, productCatId, commercialServiceId, uom,
               stockIntakeGroup, excludeFromSales
             ) VALUES (?, ?, ?, ?, 'Kg', ?, 1)`,
          )
          .run(
            poolName,
            productCode,
            productCatId,
            commercialServiceId,
            stockIntakeGroup,
          );
    poolId = Number(result.lastInsertRowid);
  } else {
    db.prepare(
      `UPDATE Product
       SET stockIntakeGroup = ?,
           excludeFromSales = 1,
           stockPoolProductId = NULL
       WHERE productId = ?`,
    ).run(stockIntakeGroup, poolId);
    if (poolOmitsStorageLocation) {
      db.prepare(
        `UPDATE Product SET omitsStorageLocation = 1 WHERE productId = ?`,
      ).run(poolId);
    }
  }

  for (const memberId of memberIds) {
    db.prepare(
      `UPDATE Product
       SET stockIntakeGroup = ?,
           stockPoolProductId = ?
       WHERE productId = ?`,
    ).run(stockIntakeGroup, poolId, memberId);
  }

  return poolId;
}

export function productHasStockIntakeColumns(db: Database.Database): boolean {
  const columns = db
    .prepare(`PRAGMA table_info(Product)`)
    .all() as Array<{ name: string }>;
  return columns.some((column) => column.name === "stockIntakeGroup");
}

/** Idempotent backfill of intake pool products and member mappings. */
export function applyStockIntakeProductBackfill(db: Database.Database): void {
  if (!productHasStockIntakeColumns(db)) {
    return;
  }

  ensurePoolProduct(
    db,
    SLUDGE_OIL_POOL_PRODUCT_NAME,
    "SLU",
    "SLUDGE_OIL",
    findMemberIds(db, SLUDGE_MEMBER_PRODUCT_NAMES),
  );

  ensurePoolProduct(
    db,
    PALM_KERNEL_POOL_PRODUCT_NAME,
    "PK",
    "PALM_KERNEL",
    findMemberIds(db, PALM_KERNEL_MEMBER_PRODUCT_NAMES),
  );

  const loosePalmOilId = findProductByName(db, LOOSE_PALM_OIL_PRODUCT_NAME);
  if (loosePalmOilId != null) {
    db.prepare(
      `UPDATE Product
       SET stockIntakeGroup = 'PALM_OIL'
       WHERE productId = ?`,
    ).run(loosePalmOilId);
  }
}

export function getSludgeOilPoolProductId(db: Database.Database): number | null {
  return findProductByName(db, SLUDGE_OIL_POOL_PRODUCT_NAME);
}

export function getSludgeMemberProductIds(db: Database.Database): number[] {
  return findMemberIds(db, SLUDGE_MEMBER_PRODUCT_NAMES);
}

export function getSludgeLandingProductId(db: Database.Database): number | null {
  return findProductByName(db, SLUDGE_MEMBER_PRODUCT_NAMES[0]);
}

export function getPalmKernelPoolProductId(db: Database.Database): number | null {
  return findProductByName(db, PALM_KERNEL_POOL_PRODUCT_NAME);
}

export function getPalmKernelMemberProductIds(db: Database.Database): number[] {
  return findMemberIds(db, PALM_KERNEL_MEMBER_PRODUCT_NAMES);
}

export function getPalmKernelLandingProductId(db: Database.Database): number | null {
  return findProductByName(db, PALM_KERNEL_MEMBER_PRODUCT_NAMES[0]);
}

export function getAllIntakePoolProductIds(db: Database.Database): number[] {
  const ids: number[] = [];
  const sludgeId = getSludgeOilPoolProductId(db);
  const palmKernelId = getPalmKernelPoolProductId(db);
  if (sludgeId != null) {
    ids.push(sludgeId);
  }
  if (palmKernelId != null) {
    ids.push(palmKernelId);
  }
  return ids;
}
