import type { PermissionActionKey, RolePermissionsSnapshot } from "./permissions.types.ts";
import type { RouteAccess } from "./roles.ts";
export declare function getRouteAccessFromSnapshot(snapshot: RolePermissionsSnapshot, routeId: string): RouteAccess;
export declare function canAccessRouteFromSnapshot(snapshot: RolePermissionsSnapshot, routeId: string): boolean;
export declare function canWriteRouteFromSnapshot(snapshot: RolePermissionsSnapshot, routeId: string): boolean;
export declare function canPerformActionFromSnapshot(snapshot: RolePermissionsSnapshot, actionKey: PermissionActionKey): boolean;
export declare function filterSectionsForPermissions<TSection extends {
    routes: readonly {
        id: string;
    }[];
}>(sections: readonly TSection[], snapshot: RolePermissionsSnapshot): TSection[];
