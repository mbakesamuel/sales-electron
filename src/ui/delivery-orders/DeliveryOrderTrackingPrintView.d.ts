import type { DeliveryOrderTrackPayload } from "./types.ts";
import "./DeliveryOrderPrintView.css";
interface DeliveryOrderTrackingPrintViewProps {
    payload: DeliveryOrderTrackPayload;
    onClose: () => void;
}
export declare function DeliveryOrderTrackingPrintView({ payload, onClose, }: DeliveryOrderTrackingPrintViewProps): import("preact").JSX.Element;
export {};
