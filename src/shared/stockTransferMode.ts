export type TransferMode = "INTER_SALES_POINT" | "INTRA_SALES_POINT";

export function resolveTransferMode(
  fromSalesPointId: number,
  toSalesPointId: number,
): TransferMode {
  return fromSalesPointId === toSalesPointId
    ? "INTRA_SALES_POINT"
    : "INTER_SALES_POINT";
}

export function isIntraSalesPointTransfer(
  fromSalesPointId: number,
  toSalesPointId: number,
): boolean {
  return fromSalesPointId === toSalesPointId;
}

export const TRANSFER_MODE_LABELS: Record<TransferMode, string> = {
  INTER_SALES_POINT: "Inter-site",
  INTRA_SALES_POINT: "Location move",
};
