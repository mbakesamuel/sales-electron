import type { SalesProductOption } from "./types.ts";
export interface SalesLineDraft {
    productId: string;
    qtyKg: string;
    qtyUnits: string;
    unitPricePerKg: string;
    unitPricePerUnit: string;
    storageLocationId: string;
}
interface SalesLineModalProps {
    line: SalesLineDraft;
    products: SalesProductOption[];
    salesPointId: number | null;
    isBottleMode: boolean;
    isSpecialDisposition: boolean;
    useRegisteredCustomer: boolean;
    customerId: string;
    transactionDate: string;
    mode: "add" | "edit";
    onClose: () => void;
    onSave: (line: SalesLineDraft) => void;
}
export declare function SalesLineModal({ line, products, salesPointId, isBottleMode, isSpecialDisposition, useRegisteredCustomer, customerId, transactionDate, mode, onClose, onSave, }: SalesLineModalProps): import("preact").JSX.Element;
export {};
