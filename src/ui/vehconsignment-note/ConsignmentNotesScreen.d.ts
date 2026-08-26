import type { AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "./VcnPrintView.css";
import "../sales/sales.css";
interface ConsignmentNotesScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
}
export declare function ConsignmentNotesScreen({ user, permissions, }: ConsignmentNotesScreenProps): import("preact").JSX.Element;
export {};
