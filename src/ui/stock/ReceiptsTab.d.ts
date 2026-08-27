import type { ProductOption, ReceiptListRow, SalesPointOption, StockBalanceRow, StockProductFilter, StorageLocationOption } from "../../shared/stock.types.ts";

interface ReceiptsTabProps {
  rows: ReceiptListRow[];
  salesPoints: SalesPointOption[];
  storageLocations: StorageLocationOption[];
  products: ProductOption[];
  onHand: StockBalanceRow[];
  scopedSalesPointId: number | null;
  canPost: boolean;
  canCancel: boolean;
  canDraft: boolean;
  canDirectPost: boolean;
  autoGenerateReceiptNo: boolean;
  userId: string;
  viewProductFilter?: StockProductFilter;
  onOk: (text: string) => void;
  onErr: (text: string) => void;
}

export declare function ReceiptsTab(props: ReceiptsTabProps): import("preact").JSX.Element;
export {};
