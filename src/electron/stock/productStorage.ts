import type Database from "better-sqlite3";
import {
  STORAGE_OMIT_STOCK_DOC_ERROR,
  productOmitsStorageLocation,
} from "../../shared/productStorageRules.js";
import { getDatabase } from "../db/index.js";

export function productCatCodeForId(
  db: Database.Database,
  productId: number,
): string | null {
  const row = db
    .prepare(
      `SELECT pc.productCode
       FROM Product p
       INNER JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE p.productId = ?`,
    )
    .get(productId) as { productCode: string } | undefined;
  return row?.productCode ?? null;
}

export function productOmitsStorageLocationById(
  db: Database.Database,
  productId: number,
): boolean {
  return productOmitsStorageLocation(productCatCodeForId(db, productId));
}

/** Loose Palm Oil = ProductCat.isMain = 1. */
export function productIsLoosePalmOilById(
  db: Database.Database,
  productId: number,
): boolean {
  const row = db
    .prepare(
      `SELECT COALESCE(pc.isMain, 0) AS isMain
       FROM Product p
       INNER JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE p.productId = ?`,
    )
    .get(productId) as { isMain: number } | undefined;
  return Number(row?.isMain ?? 0) === 1;
}

export function productIsBottledById(
  db: Database.Database,
  productId: number,
): boolean {
  const row = db
    .prepare(
      `SELECT COALESCE(pc.isBottled, 0) AS isBottled
       FROM Product p
       INNER JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE p.productId = ?`,
    )
    .get(productId) as { isBottled: number } | undefined;
  return Number(row?.isBottled ?? 0) === 1;
}

export function loadLoosePalmOilAllowInterSalesPointTransfer(
  db: ReturnType<typeof getDatabase> = getDatabase(),
): boolean {
  try {
    const columns = db
      .prepare(`PRAGMA table_info(CompanySettings)`)
      .all() as Array<{ name: string }>;
    if (
      !columns.some((col) => col.name === "loosePalmOilAllowInterSalesPointTransfer")
    ) {
      return false;
    }

    const row = db
      .prepare(
        `SELECT loosePalmOilAllowInterSalesPointTransfer
         FROM CompanySettings
         WHERE id = 'default'`,
      )
      .get() as
      | { loosePalmOilAllowInterSalesPointTransfer: number | null }
      | undefined;

    if (row?.loosePalmOilAllowInterSalesPointTransfer == null) {
      return false;
    }
    return Number(row.loosePalmOilAllowInterSalesPointTransfer) !== 0;
  } catch {
    return false;
  }
}

/** Inter transfers: bottled always; loose Palm Oil only when company setting allows. */
export function assertInterTransferProductsAllowed(
  db: Database.Database,
  productIds: number[],
): void {
  const allowLoosePalmOil = loadLoosePalmOilAllowInterSalesPointTransfer(db);
  for (const productId of productIds) {
    if (productIsBottledById(db, productId)) {
      continue;
    }
    if (productIsLoosePalmOilById(db, productId)) {
      if (allowLoosePalmOil) {
        continue;
      }
      throw new Error(
        "Loose Palm Oil cannot be transferred between collection points. Use Within collection point instead.",
      );
    }
    throw new Error(
      "Only bottled products can be transferred between collection points. Use Within collection point for loose products.",
    );
  }
}

export function loadLoosePalmOilRequireSalesTank(
  db: ReturnType<typeof getDatabase> = getDatabase(),
): boolean {
  try {
    const columns = db
      .prepare(`PRAGMA table_info(CompanySettings)`)
      .all() as Array<{ name: string }>;
    if (!columns.some((col) => col.name === "loosePalmOilRequireSalesTank")) {
      return true;
    }

    const row = db
      .prepare(
        `SELECT loosePalmOilRequireSalesTank
         FROM CompanySettings
         WHERE id = 'default'`,
      )
      .get() as { loosePalmOilRequireSalesTank: number | null } | undefined;

    if (row?.loosePalmOilRequireSalesTank == null) {
      return true;
    }
    return Number(row.loosePalmOilRequireSalesTank) !== 0;
  } catch {
    return true;
  }
}

/** True when loose sale of this product must use a sales tank. */
export function productRequiresSalesTankForLooseSale(
  db: Database.Database,
  productId: number,
): boolean {
  return (
    productIsLoosePalmOilById(db, productId) &&
    loadLoosePalmOilRequireSalesTank(db)
  );
}

/** Throws when any product is PKCP/PKP (no location-bound stock docs). */
export function assertProductsAllowStorageLocation(
  db: Database.Database,
  productIds: number[],
): void {
  for (const productId of productIds) {
    if (productOmitsStorageLocationById(db, productId)) {
      throw new Error(STORAGE_OMIT_STOCK_DOC_ERROR);
    }
  }
}

/** PKCP/PKP must use null location; all other products must not. */
export function assertMovementLocationRules(
  db: Database.Database,
  productId: number,
  storageLocationId: number | null,
): void {
  const omits = productOmitsStorageLocationById(db, productId);
  if (omits && storageLocationId != null) {
    throw new Error(STORAGE_OMIT_STOCK_DOC_ERROR);
  }
  if (!omits && storageLocationId == null) {
    throw new Error("Storage location is required for this product.");
  }
}

/** SQL fragment: exclude PKCP/PKP category codes (alias for ProductCat). */
export function storageOmitProductCatSql(aliasPc = "pc"): string {
  return `UPPER(TRIM(COALESCE(${aliasPc}.productCode, ''))) NOT IN ('PKCP', 'PKP')`;
}
