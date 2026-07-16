import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
interface SalesScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    readOnly?: boolean;
}
export declare function SalesScreen({ user, permissions, readOnly }: SalesScreenProps): import("preact").JSX.Element;
export {};
