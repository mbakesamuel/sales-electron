import type { PermissionActionKey, RolePermissionsSnapshot } from "./permissions.types.ts";
import type { RouteAccess } from "./roles.ts";
export declare function getRouteAccessFromSnapshot(snapshot: RolePermissionsSnapshot, routeId: string): RouteAccess;
export declare function canAccessRouteFromSnapshot(snapshot: RolePermissionsSnapshot, routeId: string): boolean;
export declare function canWriteRouteFromSnapshot(snapshot: RolePermissionsSnapshot, routeId: string): boolean;
export declare function canPerformActionFromSnapshot(snapshot: RolePermissionsSnapshot, actionKey: PermissionActionKey): boolean;
/** Sidebar label: bottled-only keepers see "Stock" for bottled-stock. */
export declare function stockNavLabelForRoute(snapshot: RolePermissionsSnapshot, routeId: string, defaultLabel: string): string;
export declare function filterSectionsForPermissions<TSection extends {
    routes: readonly {
        id: string;
        label?: string;
    }[];
    groups?: readonly {
        id: string;
        label: string;
        routes: readonly {
            id: string;
            label?: string;
        }[];
    }[];
}>(sections: readonly TSection[], snapshot: RolePermissionsSnapshot): TSection[];
