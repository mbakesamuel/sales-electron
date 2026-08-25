import "../delivery-orders/DeliveryOrderPrintView.css";
import "./ReceiptPrintView.css";
interface ReceiptPrintViewProps {
    receiptId: string;
    userId: string;
    onClose: () => void;
}
export declare function ReceiptPrintView({ receiptId, userId, onClose, }: ReceiptPrintViewProps): import("preact").VNode<any>;
export {};
