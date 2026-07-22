export type TransferMode = "INTER_SALES_POINT" | "INTRA_SALES_POINT";
export declare function resolveTransferMode(fromSalesPointId: number, toSalesPointId: number): TransferMode;
export declare function isIntraSalesPointTransfer(fromSalesPointId: number, toSalesPointId: number): boolean;
export declare const TRANSFER_MODE_LABELS: Record<TransferMode, string>;
