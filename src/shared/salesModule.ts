import type { RolePermissionsSnapshot } from "./permissions.types.js";
import type { RouteAccess } from "./roles.js";

/** Single gate for loose (non-bottled) sales invoicing. */
export const SALES_ROUTE_ID = "sales";

/** Single gate for bottled palm-oil sales invoicing (Store Keeper). */
export const BOTTLE_OIL_SALES_ROUTE_ID = "bottle-oil-sales";

export type SalesModuleVariant = "loose" | "bottled";

function getRouteAccess(snapshot: RolePermissionsSnapshot, routeId: string): RouteAccess {
  return snapshot.routes[routeId] ?? "none";
}

function canAccessRoute(snapshot: RolePermissionsSnapshot, routeId: string): boolean {
  return getRouteAccess(snapshot, routeId) !== "none";
}

export function canAccessLooseSalesModule(snapshot: RolePermissionsSnapshot): boolean {
  return canAccessRoute(snapshot, SALES_ROUTE_ID);
}

export function getLooseSalesModuleAccess(snapshot: RolePermissionsSnapshot): RouteAccess {
  return getRouteAccess(snapshot, SALES_ROUTE_ID);
}

export function canAccessBottleOilSalesModule(snapshot: RolePermissionsSnapshot): boolean {
  return canAccessRoute(snapshot, BOTTLE_OIL_SALES_ROUTE_ID);
}

export function getBottleOilSalesModuleAccess(
  snapshot: RolePermissionsSnapshot,
): RouteAccess {
  return getRouteAccess(snapshot, BOTTLE_OIL_SALES_ROUTE_ID);
}

export function canAccessSalesModuleForVariant(
  snapshot: RolePermissionsSnapshot,
  variant: SalesModuleVariant,
): boolean {
  if (variant === "bottled") {
    return canAccessBottleOilSalesModule(snapshot);
  }
  return canAccessLooseSalesModule(snapshot);
}

export function isSalesModuleReadOnlyForVariant(
  snapshot: RolePermissionsSnapshot,
  variant: SalesModuleVariant,
): boolean {
  if (variant === "bottled") {
    return getBottleOilSalesModuleAccess(snapshot) !== "write";
  }
  return getLooseSalesModuleAccess(snapshot) !== "write";
}

export function normalizeSalesModuleVariant(value: unknown): SalesModuleVariant {
  return value === "bottled" ? "bottled" : "loose";
}

/** Bottled-primary users (e.g. Store Keeper): bottled write without loose write. */
export function resolveSalesVariantFromAccess(
  looseAccess: RouteAccess,
  bottledAccess: RouteAccess,
  requested?: SalesModuleVariant | null,
): SalesModuleVariant {
  const hasLoose = looseAccess !== "none";
  const hasBottled = bottledAccess !== "none";

  if (hasBottled && looseAccess !== "write") {
    return "bottled";
  }
  if (hasLoose && hasBottled) {
    return normalizeSalesModuleVariant(requested);
  }
  if (hasLoose) {
    return "loose";
  }
  if (hasBottled) {
    return "bottled";
  }
  return "loose";
}

export function resolveSalesVariantFromSnapshot(
  snapshot: RolePermissionsSnapshot,
  requested?: SalesModuleVariant | null,
): SalesModuleVariant {
  return resolveSalesVariantFromAccess(
    getLooseSalesModuleAccess(snapshot),
    getBottleOilSalesModuleAccess(snapshot),
    requested,
  );
}

export function saleProductModeForVariant(
  variant: SalesModuleVariant,
): "LOOSE" | "BOTTLE" {
  return variant === "bottled" ? "BOTTLE" : "LOOSE";
}

export function salesRouteIdForProductMode(
  mode: "LOOSE" | "BOTTLE" | null | undefined,
): string {
  return mode === "BOTTLE" ? BOTTLE_OIL_SALES_ROUTE_ID : SALES_ROUTE_ID;
}
