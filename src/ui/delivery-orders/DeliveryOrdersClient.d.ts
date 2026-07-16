import type { AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "../sales/sales.css";
interface DeliveryOrdersClientProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    initialLookupNo?: string;
    onOpenList: () => void;
    onOpenQueue: () => void;
}
export declare function DeliveryOrdersClient({ user, permissions, initialLookupNo, onOpenList, onOpenQueue, }: DeliveryOrdersClientProps): import("preact").JSX.Element;
export {};
