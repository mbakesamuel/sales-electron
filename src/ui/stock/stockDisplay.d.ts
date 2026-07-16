import type { StockDocStatus, StockMovementKind } from "../../shared/stock.types.ts";
export declare const STOCK_DOC_STATUS_LABELS: Record<StockDocStatus, string>;
export declare const STOCK_MOVEMENT_KIND_LABELS: Record<StockMovementKind, string>;
export declare function statusBadgeClass(status: StockDocStatus): string;
export declare function movementQtyColumns(row: {
    qty: string;
    signedQty: string;
}, trim: (qty: string) => string): {
    plus: string | null;
    minus: string | null;
};
