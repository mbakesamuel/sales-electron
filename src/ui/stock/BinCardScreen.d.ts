import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type { StockBootstrap } from "../../shared/stock.types.ts";
import type { AuthUser } from "../auth/session.ts";
import "./StockScreen.css";
import "./BinCardScreen.css";
interface BinCardScreenProps {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    /** When true, omit standalone page header (for use inside Stock tab panel). */
    embedded?: boolean;
    /** Parent-provided bootstrap skips a duplicate getBootstrap fetch. */
    bootstrap?: StockBootstrap;
}
export declare function BinCardScreen({ user, permissions: _permissions, embedded, bootstrap: bootstrapProp, }: BinCardScreenProps): import("preact").JSX.Element;
export {};
