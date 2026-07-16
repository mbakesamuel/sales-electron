import type { ProductOption, StockBalanceRow, StockCondition, StorageLocationOption } from "../../shared/stock.types.ts";
export type ReceiptLineDraft = {
    productId: string;
    qty: string;
    storageLocationId: string;
};
export type TransferLineDraft = {
    productId: string;
    qty: string;
    fromStorageLocationId: string;
};
export type AdjustmentLineDraft = {
    productId: string;
    deltaQty: string;
    storageLocationId: string;
    fromCondition?: StockCondition;
    toCondition?: StockCondition;
};
interface ReceiptLineEditorProps {
    products: ProductOption[];
    lines: ReceiptLineDraft[];
    onChange: (next: ReceiptLineDraft[]) => void;
    locationOptions: StorageLocationOption[];
    defaultLocationId: string;
}
export declare function ReceiptLineEditor({ products, lines, onChange, locationOptions, defaultLocationId: defLoc, }: ReceiptLineEditorProps): import("preact").JSX.Element;
interface TransferLineEditorProps {
    products: ProductOption[];
    lines: TransferLineDraft[];
    onChange: (next: TransferLineDraft[]) => void;
    fromSalesPointId: string;
    onHand: StockBalanceRow[];
    fromLocationOptions: StorageLocationOption[];
    defaultFromLocationId: string;
}
export declare function TransferLineEditor({ products, lines, onChange, fromSalesPointId, onHand, fromLocationOptions, defaultFromLocationId: defFrom, }: TransferLineEditorProps): import("preact").JSX.Element;
interface AdjustmentLineEditorProps {
    products: ProductOption[];
    lines: AdjustmentLineDraft[];
    onChange: (next: AdjustmentLineDraft[]) => void;
    locationOptions: StorageLocationOption[];
    defaultLocationId: string;
    mode: "ADJUST" | "RECLASSIFY";
    onHand: StockBalanceRow[];
    salesPointId: string;
}
export declare function AdjustmentLineEditor({ products, lines, onChange, locationOptions, defaultLocationId: defLoc, mode, onHand, salesPointId, }: AdjustmentLineEditorProps): import("preact").JSX.Element;
export {};
