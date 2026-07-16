import type { AdjustmentListRow, ProductOption, SalesPointOption, StockBalanceRow, StorageLocationOption } from "../../shared/stock.types.ts";
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
    onOk: (text: string) => void;
    onErr: (text: string) => void;
}
export declare function AdjustmentsTab(props: AdjustmentsTabProps): import("preact").JSX.Element;
export {};
