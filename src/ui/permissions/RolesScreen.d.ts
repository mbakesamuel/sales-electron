import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "../customers/CustomersScreen.css";
import "./RolesScreen.css";
interface RolesScreenProps {
    permissions: RolePermissionsSnapshot;
}
export declare function RolesScreen({ permissions }: RolesScreenProps): import("preact").JSX.Element;
export {};
