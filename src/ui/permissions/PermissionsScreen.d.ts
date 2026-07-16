import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "../customers/CustomersScreen.css";
import "./PermissionsScreen.css";
interface PermissionsScreenProps {
    permissions: RolePermissionsSnapshot;
    onPermissionsSaved: (next: RolePermissionsSnapshot) => void;
}
export declare function PermissionsScreen({ permissions, onPermissionsSaved, }: PermissionsScreenProps): import("preact").JSX.Element;
export {};
