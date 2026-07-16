import type { SalesPointOption, StockBalanceRow } from "../../shared/stock.types.ts";
interface OnHandTabProps {
    salesPoints: SalesPointOption[];
    scopedSalesPointId: number | null;
    rows: StockBalanceRow[];
}
export declare function OnHandTab({ salesPoints, scopedSalesPointId, rows }: OnHandTabProps): import("preact").JSX.Element;
export {};
