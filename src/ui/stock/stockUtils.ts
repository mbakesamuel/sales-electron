import type { StorageLocationOption } from "../../shared/stock.types.ts";

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.length > 10 ? iso.slice(0, 10) : iso;
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

export function defaultLocationId(
  storageLocations: StorageLocationOption[],
  salesPointId: string | number,
): string {
  const locs = locationsForSalesPoint(storageLocations, salesPointId);
  const d = locs.find((l) => l.isDefault) ?? locs[0];
  return d ? String(d.id) : "";
}

export function utcIsoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}
