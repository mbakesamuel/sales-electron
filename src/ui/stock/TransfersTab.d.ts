import type { ProductOption, SalesPointOption, StockBalanceRow, StorageLocationOption, TransferListRow } from "../../shared/stock.types.ts";
interface TransfersTabProps {
    rows: TransferListRow[];
    salesPoints: SalesPointOption[];
    storageLocations: StorageLocationOption[];
    products: ProductOption[];
    onHand: StockBalanceRow[];
    scopedSalesPointId: number | null;
    canDispatch: boolean;
    canReceive: boolean;
    canCancel: boolean;
    canDraft: boolean;
    userId: string;
    onOk: (text: string) => void;
    onErr: (text: string) => void;
}
export declare function TransfersTab(props: TransfersTabProps): import("preact").JSX.Element;
export {};
