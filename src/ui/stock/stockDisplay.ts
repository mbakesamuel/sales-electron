import type { StockDocStatus, StockMovementKind } from "../../shared/stock.types.ts";

export const STOCK_DOC_STATUS_LABELS: Record<StockDocStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  DISPATCHED: "Dispatched",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export const STOCK_MOVEMENT_KIND_LABELS: Record<StockMovementKind, string> = {
  RECEIPT: "Receipt",
  TRANSFER_OUT: "Transfer out",
  TRANSFER_IN: "Transfer in",
  SALE: "Sale",
  SALE_REVERSAL: "Sale reversal",
  ADJUSTMENT: "Adjustment",
};

export function statusBadgeClass(status: StockDocStatus): string {
  switch (status) {
    case "DRAFT":
      return "stock-badge stock-badge-amber";
    case "POSTED":
    case "RECEIVED":
      return "stock-badge stock-badge-emerald";
    case "DISPATCHED":
      return "stock-badge stock-badge-sky";
    case "CANCELLED":
      return "stock-badge stock-badge-red";
    default:
      return "stock-badge";
  }
}

export function movementQtyColumns(
  row: { qty: string; signedQty: string },
  trim: (qty: string) => string,
): { plus: string | null; minus: string | null } {
  const signedNum = Number.parseFloat(row.signedQty);
  if (!Number.isFinite(signedNum) || signedNum === 0) {
    return { plus: null, minus: null };
  }
  const magnitudeNum = Math.abs(Number.parseFloat(row.qty));
  const magnitude = trim(magnitudeNum.toFixed(3));
  return signedNum > 0 ? { plus: magnitude, minus: null } : { plus: null, minus: magnitude };
}
