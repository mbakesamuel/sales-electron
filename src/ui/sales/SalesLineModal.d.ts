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
    preferredStorageLocationId?: string;
    isBottleMode: boolean;
    isSpecialDisposition: boolean;
    useRegisteredCustomer: boolean;
    customerId: string;
    transactionDate: string;
    /** When true, Loose Palm Oil lines only list sales tank locations. */
    loosePalmOilRequireSalesTank?: boolean;
    mode: "add" | "edit";
    onClose: () => void;
    onSave: (line: SalesLineDraft) => void;
}
export declare function SalesLineModal({ line, products, salesPointId, preferredStorageLocationId, isBottleMode, isSpecialDisposition, useRegisteredCustomer, customerId, transactionDate, loosePalmOilRequireSalesTank, mode, onClose, onSave, }: SalesLineModalProps): import("preact").JSX.Element;
export {};
