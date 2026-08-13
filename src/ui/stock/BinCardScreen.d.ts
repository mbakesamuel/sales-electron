import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "./StockScreen.css";
import "./BinCardScreen.css";
interface BinCardScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
}
export declare function BinCardScreen({ user }: BinCardScreenProps): import("preact").JSX.Element;
export {};
