import type { StockBalanceRow, StorageLocationOption } from "../../shared/stock.types.ts";
import {
  formatDisplayDate,
  formatDisplayDateTime,
} from "../../shared/formatDisplayDate.ts";

export function formatDateTime(iso: string | null | undefined): string {
  return formatDisplayDateTime(iso);
}

export function formatDate(iso: string | null | undefined): string {
  return formatDisplayDate(iso);
}

export function trimQty(qty: string): string {
  if (!qty.includes(".")) return qty;
  const trimmed = qty.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed || "0";
}

export function locationsForSalesPoint(
  storageLocations: StorageLocationOption[],
  salesPointId: string | number,
): StorageLocationOption[] {
  const spId = Number(salesPointId);
  if (!Number.isFinite(spId)) return [];
  return storageLocations.filter((l) => l.salesPointId === spId);
}

/** Storage locations eligible for goods-in receipts (excludes sales tanks). */
export function locationsForReceiptAtSalesPoint(
  storageLocations: StorageLocationOption[],
  salesPointId: string | number,
): StorageLocationOption[] {
  return locationsForSalesPoint(storageLocations, salesPointId).filter(
    (location) => !location.isSalesTank,
  );
}

export function defaultLocationId(
  storageLocations: StorageLocationOption[],
  salesPointId: string | number,
): string {
  const locs = locationsForSalesPoint(storageLocations, salesPointId);
  const d = locs.find((l) => l.isDefault) ?? locs[0];
  return d ? String(d.id) : "";
}

function isBottleOilStoreLocationName(name: string): boolean {
  return name.toLowerCase().includes("bottle");
}

export function defaultReceiptLocationId(
  storageLocations: StorageLocationOption[],
  salesPointId: string | number,
  forBottled = false,
): string {
  const locs = locationsForReceiptAtSalesPoint(storageLocations, salesPointId);
  if (forBottled) {
    const bottleStore = locs.find((l) => isBottleOilStoreLocationName(l.name));
    if (bottleStore) {
      return String(bottleStore.id);
    }
  }
  const d = locs.find((l) => l.isDefault) ?? locs[0];
  return d ? String(d.id) : "";
}

const QTY_EPS = 0.000001;

function hasPositiveQty(qty: string): boolean {
  const n = Number.parseFloat(qty);
  return Number.isFinite(n) && Math.abs(n) > QTY_EPS;
}

/** Locations that already hold this product, or have no on-hand of any product. */
export function receiptLocationOptionsForProduct(
  locationOptions: StorageLocationOption[],
  onHand: StockBalanceRow[],
  salesPointId: string | number,
  productId: string,
): StorageLocationOption[] {
  if (!productId) {
    return locationOptions;
  }

  const spId = Number(salesPointId);
  const productIdNum = Number(productId);
  if (!Number.isFinite(spId) || !Number.isFinite(productIdNum)) {
    return locationOptions;
  }

  const occupiedIds = new Set<number>();
  const holdingProductIds = new Set<number>();
  for (const row of onHand) {
    if (row.salesPointId !== spId || !hasPositiveQty(row.qty)) {
      continue;
    }
    occupiedIds.add(row.storageLocationId);
    if (row.productId === productIdNum) {
      holdingProductIds.add(row.storageLocationId);
    }
  }

  return locationOptions.filter(
    (loc) => holdingProductIds.has(loc.id) || !occupiedIds.has(loc.id),
  );
}

export function utcIsoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Clamp YYYY-MM-DD into [startDate, endDate] when a period is provided. */
export function clampIsoDateToRange(
  isoDate: string,
  range: { startDate: string; endDate: string } | null | undefined,
): string {
  if (!range) {
    return isoDate;
  }
  if (isoDate < range.startDate) {
    return range.startDate;
  }
  if (isoDate > range.endDate) {
    return range.endDate;
  }
  return isoDate;
}
