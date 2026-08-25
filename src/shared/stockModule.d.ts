import type { RolePermissionsSnapshot } from "./permissions.types.js";
import type { RouteAccess } from "./roles.js";
/** Legacy per-tab / table routes (still in catalog for matrix compatibility). */
export declare const STOCK_MODULE_ROUTE_IDS: readonly ["stock-balance", "stock-movements", "stock-receipts", "stock-receipt-lines", "stock-transfers", "stock-transfer-lines", "stock-adjustments", "stock-adjustment-lines"];
/** Single gate for the bulk (non-bottled) stock management environment. */
export declare const STOCK_MODULE_ROUTE_ID = "stock";
/** Single gate for the bottled stock management environment. */
export declare const BOTTLED_STOCK_ROUTE_ID = "bottled-stock";
export type StockProductFilter = "bulk" | "bottled";
export type StockModuleVariant = StockProductFilter;
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
export declare function canAccessBottledStockModule(snapshot: RolePermissionsSnapshot): boolean;
export declare function getBottledStockModuleAccess(snapshot: RolePermissionsSnapshot): RouteAccess;
export declare function canAccessStockTab(snapshot: RolePermissionsSnapshot, _tabId: StockTabId): boolean;
export declare function isStockTabReadOnly(snapshot: RolePermissionsSnapshot, _tabId: StockTabId): boolean;
/** Bulk and bottled environments are each gated by a single module route. */
export declare function canAccessStockTabForVariant(snapshot: RolePermissionsSnapshot, variant: StockModuleVariant, tabId: StockTabId): boolean;
export declare function isStockTabReadOnlyForVariant(snapshot: RolePermissionsSnapshot, variant: StockModuleVariant, tabId: StockTabId): boolean;
export declare function getVisibleStockTabs(snapshot: RolePermissionsSnapshot): StockTabId[];
export declare function getVisibleStockTabsForVariant(snapshot: RolePermissionsSnapshot, variant: StockModuleVariant): StockTabId[];
export declare function normalizeStockProductFilter(value: unknown): StockProductFilter;
/** Bottled-only users (e.g. Store Keeper) use bottled stock; everyone else defaults to bulk. */
export declare function resolveStockProductFilterFromAccess(bulkAccess: RouteAccess, bottledAccess: RouteAccess, requested?: StockProductFilter | null): StockProductFilter;
export declare function resolveStockProductFilterFromSnapshot(snapshot: RolePermissionsSnapshot, requested?: StockProductFilter | null): StockProductFilter;
