import "../delivery-orders/DeliveryOrderPrintView.css";
import "./ReceiptPrintView.css";
import "./TransferPrintView.css";
interface TransferPrintViewProps {
    transferId: string;
    userId: string;
    onClose: () => void;
}
export declare function TransferPrintView({ transferId, userId, onClose, }: TransferPrintViewProps): import("preact").VNode<any>;
export {};
