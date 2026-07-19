export interface CarryForwardStockRow {
  salesPointId: number;
  salesPointName: string;
  storageLocationId: number;
  storageLocationName: string;
  productId: number;
  productName: string;
  uom: string;
  /** Current on-hand (SELLABLE) at this location. */
  currentQty: number;
  lastAdjustmentNo: string | null;
  lastOccurredAt: string | null;
}

export interface CarryForwardStockFormOptions {
  products: Array<{ productId: number; productName: string; uom: string }>;
  salesPoints: Array<{ id: number; name: string }>;
  storageLocations: Array<{
    id: number;
    salesPointId: number;
    name: string;
    isDefault: boolean;
  }>;
}

export interface UpsertCarryForwardStockBatchLine {
  storageLocationId: number;
  /** Desired on-hand qty (SELLABLE). Omit / NaN lines are skipped. */
  onHandQty: number;
}

export interface UpsertCarryForwardStockBatchInput {
  userId: string;
  salesPointId: number;
  productId: number;
  notes?: string | null;
  lines: UpsertCarryForwardStockBatchLine[];
}

export type CarryForwardStockBatchResult =
  | { ok: true; saved: number; adjustmentNo: string | null }
  | { ok: false; error: string };

export interface CarryForwardStockOnHandRow {
  storageLocationId: number;
  qty: number;
}
