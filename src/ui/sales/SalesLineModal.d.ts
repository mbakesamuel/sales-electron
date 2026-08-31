import type { SalesProductOption } from "./types.ts";
import type { SaleDisposition } from "../../shared/sales.types.ts";
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
    saleDisposition: SaleDisposition;
    useRegisteredCustomer: boolean;
    customerId: string;
    transactionDate: string;
    /** When true, Loose Palm Oil lines only list sales tank locations. */
    loosePalmOilRequireSalesTank?: boolean;
    mode: "add" | "edit";
    lockUnitPriceFromSchedule: boolean;
    onClose: () => void;
    onSave: (line: SalesLineDraft) => void;
}
export declare function SalesLineModal({ line, products, salesPointId, preferredStorageLocationId, isBottleMode, saleDisposition, useRegisteredCustomer, customerId, transactionDate, loosePalmOilRequireSalesTank, mode, lockUnitPriceFromSchedule, onClose, onSave, }: SalesLineModalProps): import("preact").JSX.Element;
export {};
