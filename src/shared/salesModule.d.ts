import type { RolePermissionsSnapshot } from "./permissions.types.js";
import type { RouteAccess } from "./roles.js";
/** Single gate for loose (non-bottled) sales invoicing. */
export declare const SALES_ROUTE_ID = "sales";
/** Single gate for bottled palm-oil sales invoicing (Store Keeper). */
export declare const BOTTLE_OIL_SALES_ROUTE_ID = "bottle-oil-sales";
export type SalesModuleVariant = "loose" | "bottled";
export declare function canAccessLooseSalesModule(snapshot: RolePermissionsSnapshot): boolean;
export declare function getLooseSalesModuleAccess(snapshot: RolePermissionsSnapshot): RouteAccess;
export declare function canAccessBottleOilSalesModule(snapshot: RolePermissionsSnapshot): boolean;
export declare function getBottleOilSalesModuleAccess(snapshot: RolePermissionsSnapshot): RouteAccess;
export declare function canAccessSalesModuleForVariant(snapshot: RolePermissionsSnapshot, variant: SalesModuleVariant): boolean;
export declare function isSalesModuleReadOnlyForVariant(snapshot: RolePermissionsSnapshot, variant: SalesModuleVariant): boolean;
export declare function normalizeSalesModuleVariant(value: unknown): SalesModuleVariant;
/** Bottled-primary users (e.g. Store Keeper): bottled write without loose write. */
export declare function resolveSalesVariantFromAccess(looseAccess: RouteAccess, bottledAccess: RouteAccess, requested?: SalesModuleVariant | null): SalesModuleVariant;
export declare function resolveSalesVariantFromSnapshot(snapshot: RolePermissionsSnapshot, requested?: SalesModuleVariant | null): SalesModuleVariant;
export declare function saleProductModeForVariant(variant: SalesModuleVariant): "LOOSE" | "BOTTLE";
export declare function salesRouteIdForProductMode(mode: "LOOSE" | "BOTTLE" | null | undefined): string;
