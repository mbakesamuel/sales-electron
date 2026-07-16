import type { PermissionActionKey, RolePermissionsSnapshot } from "./permissions.types.ts";
import type { RouteAccess } from "./roles.ts";
import { canAccessStockModule } from "./stockModule.js";

export function getRouteAccessFromSnapshot(
  snapshot: RolePermissionsSnapshot,
  routeId: string,
): RouteAccess {
  return snapshot.routes[routeId] ?? "none";
}

export function canAccessRouteFromSnapshot(
  snapshot: RolePermissionsSnapshot,
  routeId: string,
): boolean {
  return getRouteAccessFromSnapshot(snapshot, routeId) !== "none";
}

export function canWriteRouteFromSnapshot(
  snapshot: RolePermissionsSnapshot,
  routeId: string,
): boolean {
  return getRouteAccessFromSnapshot(snapshot, routeId) === "write";
}

export function canPerformActionFromSnapshot(
  snapshot: RolePermissionsSnapshot,
  actionKey: PermissionActionKey,
): boolean {
  return snapshot.actions[actionKey] ?? false;
}

export function filterSectionsForPermissions<
  TSection extends { routes: readonly { id: string }[] },
>(sections: readonly TSection[], snapshot: RolePermissionsSnapshot): TSection[] {
  return sections
    .map((section) => ({
      ...section,
      routes: section.routes.filter((route) =>
        route.id === "stock"
          ? canAccessStockModule(snapshot)
          : canAccessRouteFromSnapshot(snapshot, route.id),
      ),
    }))
    .filter((section) => section.routes.length > 0);
}
