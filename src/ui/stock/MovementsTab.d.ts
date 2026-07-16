import type { SalesPointOption, StockMovementRow } from "../../shared/stock.types.ts";
interface MovementsTabProps {
    rows: StockMovementRow[];
    salesPoints: SalesPointOption[];
    scopedSalesPointId: number | null;
}
export declare function MovementsTab({ rows, salesPoints, scopedSalesPointId }: MovementsTabProps): import("preact").JSX.Element;
export {};
