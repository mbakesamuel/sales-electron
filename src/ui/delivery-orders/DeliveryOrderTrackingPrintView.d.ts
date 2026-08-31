import type { DeliveryOrderTrackPayload } from "./types.ts";
import "../reports/StockCommitmentReport.css";
import "./DeliveryOrderPrintView.css";
interface DeliveryOrderTrackingPrintViewProps {
    payload: DeliveryOrderTrackPayload;
    onClose: () => void;
}
export declare function DeliveryOrderTrackingPrintView({ payload, onClose, }: DeliveryOrderTrackingPrintViewProps): import("preact").JSX.Element;
export {};
