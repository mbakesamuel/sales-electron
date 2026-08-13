import type { SalesStorageLocationBalanceOption } from "./types.ts";

const QTY_EPS = 0.000001;

export function locationCoversQty(
  rows: SalesStorageLocationBalanceOption[],
  storageLocationId: string,
  requiredQty: number,
): boolean {
  if (!storageLocationId) {
    return false;
  }
  const row = rows.find((entry) => String(entry.id) === storageLocationId);
  return row != null && row.qty + QTY_EPS >= requiredQty;
}

/**
 * Prefer preferredLocationId when it has enough stock; else first by list order
 * (already sorted by location name) that can cover requiredQty.
 */
export function pickLocationForQty(
  rows: SalesStorageLocationBalanceOption[],
  requiredQty: number,
  preferredLocationId?: string | null,
): string {
  if (rows.length === 0) {
    return "";
  }

  const preferred = preferredLocationId?.trim() || "";
  if (preferred && locationCoversQty(rows, preferred, requiredQty)) {
    return preferred;
  }

  const covering = rows.find((row) => row.qty + QTY_EPS >= requiredQty);
  return covering ? String(covering.id) : "";
}
