import "../sales/sales.css";
import "./DeliveryOrderTrackingScreen.css";
interface DeliveryOrderTrackingScreenProps {
    initialLookupNo?: string;
    onOpenInDeliveryOrdering?: (deliveryOrderNo: string) => void;
}
export declare function DeliveryOrderTrackingScreen({ initialLookupNo, onOpenInDeliveryOrdering, }: DeliveryOrderTrackingScreenProps): import("preact").JSX.Element;
export {};
