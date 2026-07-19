import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "../components/FormDialog.css";
import "../commitments/CarryForwardCommitmentsScreen.css";
interface CarryForwardStockScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    readOnly?: boolean;
}
export declare function CarryForwardStockScreen({ user, permissions, readOnly, }: CarryForwardStockScreenProps): import("preact").JSX.Element;
export {};
