import { type PermissionActionKey } from "./permissions.types.js";
export interface PermissionUiGroup {
    id: string;
    label: string;
    routeIds: readonly string[];
    actionKeys: readonly PermissionActionKey[];
}
/**
 * Operator-facing order for the Role permissions matrix.
 * Every catalog route id and every permission action key must appear in exactly one group.
 */
export declare const PERMISSION_UI_GROUPS: readonly PermissionUiGroup[];
