import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "../components/FormDialog.css";
import "../customers/CustomersScreen.css";
interface RolesScreenProps {
    permissions: RolePermissionsSnapshot;
}
export declare function RolesScreen({ permissions }: RolesScreenProps): import("preact").JSX.Element;
export {};
