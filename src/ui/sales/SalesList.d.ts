interface SalesListProps {
    onOpenInvoice: (invoiceNo: string) => void;
    onOpenPos?: () => void;
}
export declare function SalesList({ onOpenInvoice, onOpenPos }: SalesListProps): import("preact").JSX.Element;
export {};
