export interface CarryForwardStockRow {
  salesPointId: number;
  salesPointName: string;
  /** Null for PKCP/PKP (collection-point-level balance). */
  storageLocationId: number | null;
  storageLocationName: string;
  productId: number;
  productName: string;
  uom: string;
  /** Current on-hand (SELLABLE) at this location or collection point. */
  currentQty: number;
  lastAdjustmentNo: string | null;
  lastOccurredAt: string | null;
}

export interface CarryForwardStockPendingRow {
  adjustmentId: string;
  adjustmentNo: string;
  occurredAt: string;
  salesPointId: number;
  salesPointName: string;
  productId: number;
  productName: string;
  uom: string;
  storageLocationId: number | null;
  storageLocationName: string;
  currentQty: number;
  proposedQty: number;
  submittedAt: string | null;
}

export interface CarryForwardStockProductOption {
  productId: number;
  productName: string;
  uom: string;
  isBottled: boolean;
  productCatCode: string;
  omitsStorageLocation: boolean;
  stockIntakeGroup?: "PALM_OIL" | "SLUDGE_OIL" | "PALM_KERNEL" | null;
  stockPoolProductId?: number | null;
  excludeFromSales?: boolean;
  isStockPool?: boolean;
}

export interface CarryForwardStockFormOptions {
  products: CarryForwardStockProductOption[];
  salesPoints: Array<{ id: number; name: string }>;
  storageLocations: Array<{
    id: number;
    salesPointId: number;
    name: string;
    isDefault: boolean;
  }>;
  /** When true, bulk intake uses Palm Oil / Sludge Oil grouping. */
  stockIntakeOilGrouping: boolean;
}

export interface UpsertCarryForwardStockBatchLine {
  /** Omit or null for PKCP/PKP products. */
  storageLocationId?: number | null;
  productId: number;
  /** Desired on-hand qty (SELLABLE). Omit / NaN lines are skipped. */
  onHandQty: number;
}

export interface UpsertCarryForwardStockBatchInput {
  userId: string;
  salesPointId: number;
  /** Business date (YYYY-MM-DD) within the open financial month. */
  occurredAt: string;
  notes?: string | null;
  lines: UpsertCarryForwardStockBatchLine[];
}

export type CarryForwardStockBatchResult =
  | { ok: true; saved: number; adjustmentNo: string | null; pendingValidation?: boolean }
  | { ok: false; error: string };

export interface CarryForwardStockOnHandRow {
  storageLocationId: number | null;
  qty: number;
}
