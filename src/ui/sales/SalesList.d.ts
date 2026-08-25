import type { SaleProductMode } from "../../shared/sales.types.ts";
import type { SalesModuleVariant } from "../../shared/salesModule.ts";
interface SalesListProps {
    variant?: SalesModuleVariant;
    listTitle?: string;
    productMode: SaleProductMode;
    onOpenInvoice: (invoiceNo: string) => void;
    onOpenPos?: () => void;
}
export declare function SalesList({ variant, listTitle, productMode, onOpenInvoice, onOpenPos, }: SalesListProps): import("preact").JSX.Element;
export {};
