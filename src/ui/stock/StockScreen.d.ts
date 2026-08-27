import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { type StockModuleVariant } from "../../shared/stockModule.ts";
import type { AuthUser } from "../auth/session.ts";
import "./StockScreen.css";

interface StockScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  variant?: StockModuleVariant;
}

export declare function StockScreen({
  user,
  permissions,
  variant,
}: StockScreenProps): import("preact").JSX.Element;
export {};
