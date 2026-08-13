import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "./StockScreen.css";
interface StockScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    onOpenBinCard?: () => void;
}
export declare function StockScreen({ user, permissions, onOpenBinCard }: StockScreenProps): import("preact").JSX.Element;
export {};
