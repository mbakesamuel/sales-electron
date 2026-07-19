import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "../components/FormDialog.css";
import "./CarryForwardCommitmentsScreen.css";
interface CarryForwardCommitmentsScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    readOnly?: boolean;
}
export declare function CarryForwardCommitmentsScreen({ user, permissions, readOnly, }: CarryForwardCommitmentsScreenProps): import("preact").JSX.Element;
export {};
