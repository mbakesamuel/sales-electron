import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "./StockScreen.css";
interface StockScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
}
export declare function StockScreen({ user, permissions }: StockScreenProps): import("preact").JSX.Element;
export {};
