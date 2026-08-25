import type { AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { type SalesModuleVariant } from "../../shared/salesModule.ts";
import "./sales.css";
interface SalesClientProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    variant?: SalesModuleVariant;
    onOpenList: () => void;
    initialInvoiceNo?: string;
}
export declare function SalesClient({ user, permissions, variant, onOpenList, initialInvoiceNo, }: SalesClientProps): import("preact").JSX.Element;
export {};
