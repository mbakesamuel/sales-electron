import type { ComponentChildren } from "preact";
import type { StockDocStatus } from "../../shared/stock.types.ts";
export declare function StatusBadge({ status }: {
    status: StockDocStatus;
}): import("preact").JSX.Element;
export type StockDialogMessage = {
    type: "ok" | "error";
    text: string;
} | null;
interface DocDialogProps {
    title: string;
    wide?: boolean;
    message?: StockDialogMessage;
    onClose: () => void;
    children: ComponentChildren;
}
export declare function DocDialog({ title, wide, message, onClose, children, }: DocDialogProps): import("preact").VNode<any>;
interface ConfirmDialogProps {
    title: string;
    description: string;
    confirmLabel: string;
    busy?: boolean;
    message?: StockDialogMessage;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function ConfirmDialog({ title, description, confirmLabel, busy, message, onCancel, onConfirm, }: ConfirmDialogProps): import("preact").VNode<any>;
export declare function ReviewKeyValue(props: {
    label: string;
    children: ComponentChildren;
}): import("preact").JSX.Element;
interface ReviewLine {
    productName: string;
    uom: string;
    qty: string;
    deltaQty?: string;
    storageLocationName?: string;
    fromStorageLocationName?: string;
    toStorageLocationName?: string | null;
}
export declare function ReviewLineTable(props: {
    lines: ReviewLine[];
    qtyHeader?: string;
}): import("preact").JSX.Element;
export {};
