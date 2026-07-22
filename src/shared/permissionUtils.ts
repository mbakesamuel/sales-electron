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
  TSection extends {
    routes: readonly { id: string }[];
    groups?: readonly { id: string; label: string; routes: readonly { id: string }[] }[];
  },
>(sections: readonly TSection[], snapshot: RolePermissionsSnapshot): TSection[] {
  function canAccessRoute(routeId: string): boolean {
    return routeId === "stock"
      ? canAccessStockModule(snapshot)
      : canAccessRouteFromSnapshot(snapshot, routeId);
  }

  return sections
    .map((section) => {
      if (section.groups?.length) {
        const groups = section.groups
          .map((group) => ({
            ...group,
            routes: group.routes.filter((route) => canAccessRoute(route.id)),
          }))
          .filter((group) => group.routes.length > 0);
        return {
          ...section,
          groups,
          routes: groups.flatMap((group) => [...group.routes]),
        };
      }

      return {
        ...section,
        routes: section.routes.filter((route) => canAccessRoute(route.id)),
      };
    })
    .filter((section) => section.routes.length > 0);
}
