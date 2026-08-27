import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import {
  type StockModuleVariant,
  type StockProductFilter,
} from "../../shared/stockModule.ts";
import type { AuthUser } from "../auth/session.ts";
import type { StockBootstrap } from "../../shared/stock.types.ts";
import "./StockScreen.css";

interface StockClientProps {
  bootstrap: StockBootstrap;
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  variant: StockModuleVariant;
  viewFilter: StockProductFilter;
  showProductToggle: boolean;
  onViewFilterChange: (next: StockProductFilter) => void;
  onRefresh: () => void | Promise<void>;
}

export declare function StockClient({
  bootstrap,
  user,
  permissions,
  variant,
  viewFilter,
  showProductToggle,
  onViewFilterChange,
  onRefresh,
}: StockClientProps): import("preact").JSX.Element;
export {};
