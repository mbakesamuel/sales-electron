import type { AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "./VcnPrintView.css";
import "../sales/sales.css";
interface ConsignmentNotesClientProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
}
export declare function ConsignmentNotesClient({ user, permissions, }: ConsignmentNotesClientProps): import("preact").JSX.Element;
export {};
