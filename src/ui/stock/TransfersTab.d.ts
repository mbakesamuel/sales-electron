import type { ProductOption, SalesPointOption, StockBalanceRow, StockProductFilter, StorageLocationOption, TransferListRow } from "../../shared/stock.types.ts";
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
    canDirectPost: boolean;
    autoGenerateTransferNo: boolean;
    transferReceiveUsesDocumentDate: boolean;
    userId: string;
    productFilter: StockProductFilter;
    onOk: (text: string) => void;
    onErr: (text: string) => void;
}
export declare function TransfersTab(props: TransfersTabProps): import("preact").JSX.Element;
export {};
