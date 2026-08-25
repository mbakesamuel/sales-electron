import type { AdjustmentListRow, ProductOption, SalesPointOption, StockBalanceRow, StockProductFilter, StorageLocationOption } from "../../shared/stock.types.ts";
interface AdjustmentsTabProps {
    rows: AdjustmentListRow[];
    salesPoints: SalesPointOption[];
    storageLocations: StorageLocationOption[];
    products: ProductOption[];
    onHand: StockBalanceRow[];
    scopedSalesPointId: number | null;
    canPost: boolean;
    canReclassify: boolean;
    canCancel: boolean;
    canDraft: boolean;
    userId: string;
    productFilter: StockProductFilter;
    onOk: (text: string) => void;
    onErr: (text: string) => void;
}
export declare function AdjustmentsTab(props: AdjustmentsTabProps): import("preact").JSX.Element;
export {};
