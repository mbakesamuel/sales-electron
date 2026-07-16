import type { AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "./sales.css";
interface SalesClientProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    onOpenList: () => void;
    initialInvoiceNo?: string;
}
export declare function SalesClient({ user, permissions, onOpenList, initialInvoiceNo, }: SalesClientProps): import("preact").JSX.Element;
export {};
