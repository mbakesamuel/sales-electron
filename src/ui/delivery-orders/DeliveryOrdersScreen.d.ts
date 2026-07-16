import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
interface DeliveryOrdersScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    readOnly?: boolean;
}
export declare function DeliveryOrdersScreen({ user, permissions, readOnly, }: DeliveryOrdersScreenProps): import("preact").JSX.Element;
export {};
