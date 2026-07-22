export type StockDocStatus = "DRAFT" | "POSTED" | "DISPATCHED" | "RECEIVED" | "CANCELLED";
export type StockCondition = "SELLABLE" | "UNSELLABLE";
export type StockMovementKind =
  | "RECEIPT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "SALE"
  | "SALE_REVERSAL"
  | "ADJUSTMENT";

export type StockMutationResult =
  | { ok: true; id: string; documentNo: string }
  | { ok: false; error: string };

export type StockGenericResult = { ok: true } | { ok: false; error: string };

export interface SalesPointOption {
  id: number;
  name: string;
}

export interface StorageLocationOption {
  id: number;
  salesPointId: number;
  name: string;
  isDefault: boolean;
  isSellable: boolean;
}

export interface ProductOption {
  productId: number;
  productName: string;
  uom: string;
  isBottled: boolean;
}

export interface StockBalanceRow {
  salesPointId: number;
  salesPointName: string;
  storageLocationId: number;
  storageLocationName: string;
  productId: number;
  productName: string;
  uom: string;
  condition: StockCondition;
  qty: string;
}

export interface StockMovementRow {
  id: string;
  occurredAtIso: string;
  salesPointId: number;
  salesPointName: string;
  storageLocationId: number;
  storageLocationName: string;
  productId: number;
  productName: string;
  uom: string;
  kind: StockMovementKind;
  condition: StockCondition;
  qty: string;
  signedQty: string;
  sourceKind: string;
  sourceId: string;
  documentNo: string | null;
  userId: string;
  userName: string;
  notes: string | null;
  createdAtIso: string;
  /** True when movement comes from a carry-forward stock adjustment. */
  isCarryForward?: boolean;
}

export interface ReceiptListRow {
  id: string;
  receiptNo: string;
  salesPointId: number;
  salesPointName: string;
  receivedAtIso: string;
  supplierLabel: string;
  status: StockDocStatus;
  totalQty: string;
  lineCount: number;
  createdByName: string;
  postedByName: string | null;
  postedAtIso: string | null;
  createdAtIso: string;
}

export interface ReceiptDetail extends ReceiptListRow {
  notes: string | null;
  lines: Array<{
    id: string;
    productId: number;
    productName: string;
    uom: string;
    qty: string;
    storageLocationId: number;
    storageLocationName: string;
  }>;
}

export interface TransferListRow {
  id: string;
  transferNo: string;
  transferMode: import("./stockTransferMode.ts").TransferMode;
  locationSummary: string | null;
  fromSalesPointId: number;
  fromSalesPointName: string;
  toSalesPointId: number;
  toSalesPointName: string;
  dispatchedAtIso: string | null;
  receivedAtIso: string | null;
  status: StockDocStatus;
  totalQty: string;
  lineCount: number;
  createdByName: string;
  dispatchedByName: string | null;
  receivedByName: string | null;
  createdAtIso: string;
}

export interface TransferDetail extends TransferListRow {
  notes: string | null;
  lines: Array<{
    id: string;
    productId: number;
    productName: string;
    uom: string;
    qty: string;
    fromStorageLocationId: number;
    fromStorageLocationName: string;
    toStorageLocationId: number | null;
    toStorageLocationName: string | null;
  }>;
}

export interface AdjustmentListRow {
  id: string;
  adjustmentNo: string;
  salesPointId: number;
  salesPointName: string;
  occurredAtIso: string;
  reason: string;
  status: StockDocStatus;
  sourceKind: "NORMAL" | "CARRY_FORWARD";
  lineCount: number;
  createdByName: string;
  postedByName: string | null;
  postedAtIso: string | null;
  createdAtIso: string;
}

export interface AdjustmentDetail extends AdjustmentListRow {
  lines: Array<{
    id: string;
    productId: number;
    productName: string;
    uom: string;
    deltaQty: string;
    storageLocationId: number;
    storageLocationName: string;
    fromCondition: StockCondition | null;
    toCondition: StockCondition | null;
  }>;
}

export interface StockBootstrap {
  canManageReceipts: boolean;
  canDispatchTransfers: boolean;
  canReceiveTransfers: boolean;
  canPostAdjustments: boolean;
  canReclassifyStock: boolean;
  canCancelDocuments: boolean;
  canDraftReceipts: boolean;
  canDraftTransfers: boolean;
  canDraftAdjustments: boolean;
  scopedSalesPointId: number | null;
  salesPoints: SalesPointOption[];
  storageLocations: StorageLocationOption[];
  products: ProductOption[];
  onHand: StockBalanceRow[];
  movements: StockMovementRow[];
  receipts: ReceiptListRow[];
  transfers: TransferListRow[];
  adjustments: AdjustmentListRow[];
}

export type ReceiptReviewResult =
  | { ok: true; detail: ReceiptDetail }
  | { ok: false; error: string };

export type TransferReviewResult =
  | { ok: true; detail: TransferDetail }
  | { ok: false; error: string };

export type AdjustmentReviewResult =
  | { ok: true; detail: AdjustmentDetail }
  | { ok: false; error: string };

export interface SaveReceiptInput {
  userId: string;
  id?: string | null;
  salesPointId: number;
  supplierLabel: string;
  receivedAt: string;
  notes?: string | null;
  lines: Array<{
    productId: number;
    qty: string;
    storageLocationId: number;
  }>;
}

export interface SaveTransferInput {
  userId: string;
  id?: string | null;
  fromSalesPointId: number;
  toSalesPointId: number;
  dispatchedAt: string;
  notes?: string | null;
  lines: Array<{
    productId: number;
    qty: string;
    fromStorageLocationId: number;
    toStorageLocationId?: number | null;
  }>;
}

export interface ReceiveTransferInput {
  userId: string;
  transferId: string;
  lines: Array<{
    lineId: string;
    toStorageLocationId: number;
  }>;
}

export interface SaveAdjustmentInput {
  userId: string;
  id?: string | null;
  salesPointId: number;
  reason: string;
  occurredAt: string;
  lines: Array<{
    productId: number;
    deltaQty: string;
    storageLocationId: number;
    fromCondition?: StockCondition | null;
    toCondition?: StockCondition | null;
  }>;
}

export interface StockUserActionInput {
  userId: string;
  id: string;
}
