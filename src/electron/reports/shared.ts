import type { BottledPackColumn } from "../../shared/reports.types.js";
import { isStorageLocationEffectivelySellable } from "../../shared/storageLocationSellability.js";
import { getDatabase } from "../db/index.js";

export const PALM_OIL_KG_PER_LITRE = 0.85;

export const BOTTLED_PACK_ORDER = ["jug20", "carton5", "carton15", "unit1", "other"] as const;

export interface SalesPointRow {
  id: number;
  name: string;
}

export interface StorageLocationRow {
  id: number;
  salesPointId: number | null;
  millId: number | null;
  name: string;
  isActive: boolean;
  millIsActive: boolean | null;
  /** Derived: SP locations active → true; mill-owned → Mill.isActive. */
  effectivelySellable: boolean;
}

export interface ProductRow {
  productId: number;
  productName: string;
  productCode: string | null;
  productCatId: number;
  isMain: number;
  isBottled: number;
}

export function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

export function parseQty(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function loadSalesPoints(): SalesPointRow[] {
  return getDatabase()
    .prepare(`SELECT id, name FROM SalesPoint ORDER BY name ASC`)
    .all() as SalesPointRow[];
}

export function loadStorageLocations(): StorageLocationRow[] {
  return getDatabase()
    .prepare(
      `SELECT sl.id, sl.salesPointId, sl.millId, l.locationName AS name,
              COALESCE(sl.isActive, 1) AS isActive,
              m.isActive AS millIsActive
       FROM StorageLocation sl
       INNER JOIN Location l ON l.id = sl.locationId
       LEFT JOIN Mill m ON m.id = sl.millId
       ORDER BY COALESCE(sl.salesPointId, sl.millId) ASC, l.locationName ASC`,
    )
    .all()
    .map((row) => {
      const salesPointId =
        (row as { salesPointId: number | null }).salesPointId != null
          ? Number((row as { salesPointId: number }).salesPointId)
          : null;
      const millId =
        (row as { millId: number | null }).millId != null
          ? Number((row as { millId: number }).millId)
          : null;
      const isActive = (row as { isActive: number }).isActive === 1;
      const millIsActiveRaw = (row as { millIsActive: number | null }).millIsActive;
      const millIsActive =
        millId == null
          ? null
          : millIsActiveRaw === 1 || millIsActiveRaw == null
            ? true
            : false;
      return {
        id: (row as { id: number }).id,
        salesPointId,
        millId,
        name: (row as { name: string }).name,
        isActive,
        millIsActive,
        effectivelySellable: isStorageLocationEffectivelySellable({
          millId,
          millIsActive,
          isActive,
        }),
      };
    });
}

export function loadProducts(): ProductRow[] {
  return getDatabase()
    .prepare(
      `SELECT p.productId, p.productName, p.productCode, p.productCatId,
              COALESCE(pc.isMain, 0) AS isMain, COALESCE(pc.isBottled, 0) AS isBottled
       FROM Product p
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       ORDER BY p.productName ASC`,
    )
    .all() as ProductRow[];
}

export function detectBottledPack(product: Pick<ProductRow, "productName" | "productCode">): BottledPackColumn {
  const text = `${product.productName} ${product.productCode ?? ""}`.toUpperCase();
  if (text.includes("20L") || text.includes("JUG")) {
    return { id: "jug20", label: "1X20L JUG", units: 0, litresPerUnit: 20 };
  }
  if (text.includes("3X5") || (text.includes("5L") && text.includes("CTN"))) {
    return { id: "carton5", label: "3X5L CTN", units: 0, litresPerUnit: 15 };
  }
  if (text.includes("15L")) {
    return { id: "carton15", label: "1X15L CTN", units: 0, litresPerUnit: 15 };
  }
  if (text.includes("1L")) {
    return { id: "unit1", label: "1L BOTTLE", units: 0, litresPerUnit: 1 };
  }
  return { id: "other", label: "OTHER", units: 0, litresPerUnit: 1 };
}
