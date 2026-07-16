import type { RolePermissionsSnapshot } from "./permissions.types.js";
import type { RouteAccess } from "./roles.js";
export declare const STOCK_MODULE_ROUTE_IDS: readonly ["stock-balance", "stock-movements", "stock-receipts", "stock-receipt-lines", "stock-transfers", "stock-transfer-lines", "stock-adjustments", "stock-adjustment-lines"];
export type StockTabId = "balance" | "movements" | "receipts" | "transfers" | "adjustments";
export declare const STOCK_TAB_DEFINITIONS: ReadonlyArray<{
    id: StockTabId;
    label: string;
    headerTable: string;
    lineTable?: string;
    description: string;
    lineDescription?: string;
}>;
export declare function canAccessStockModule(snapshot: RolePermissionsSnapshot): boolean;
export declare function getStockModuleAccess(snapshot: RolePermissionsSnapshot): RouteAccess;
export declare function canAccessStockTab(snapshot: RolePermissionsSnapshot, tabId: StockTabId): boolean;
export declare function isStockTabReadOnly(snapshot: RolePermissionsSnapshot, tabId: StockTabId): boolean;
export declare function getVisibleStockTabs(snapshot: RolePermissionsSnapshot): StockTabId[];
