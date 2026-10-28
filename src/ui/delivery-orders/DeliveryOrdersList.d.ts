import type { AuthUser } from "../auth/session.ts";
import "../sales/sales.css";
interface DeliveryOrdersListProps {
    user: AuthUser;
    onOpenOrder: (deliveryOrderNo: string) => void;
    onOpenScreen?: () => void;
}
export declare function DeliveryOrdersList({ user, onOpenOrder, onOpenScreen, }: DeliveryOrdersListProps): import("preact").JSX.Element;
export {};
