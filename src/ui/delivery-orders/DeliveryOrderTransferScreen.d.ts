import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "../sales/sales.css";
import "./DeliveryOrderTransferScreen.css";
interface DeliveryOrderTransferScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    readOnly?: boolean;
    onOpenInDeliveryOrdering?: (deliveryOrderNo: string) => void;
    onOpenTracking?: (deliveryOrderNo: string) => void;
}
export declare function DeliveryOrderTransferScreen({ user, permissions, readOnly, onOpenInDeliveryOrdering, onOpenTracking, }: DeliveryOrderTransferScreenProps): import("preact").JSX.Element;
export {};
