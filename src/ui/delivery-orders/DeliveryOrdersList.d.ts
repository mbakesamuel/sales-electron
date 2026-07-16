import "../sales/sales.css";
interface DeliveryOrdersListProps {
    onOpenOrder: (deliveryOrderNo: string) => void;
    onOpenScreen?: () => void;
}
export declare function DeliveryOrdersList({ onOpenOrder, onOpenScreen }: DeliveryOrdersListProps): import("preact").JSX.Element;
export {};
