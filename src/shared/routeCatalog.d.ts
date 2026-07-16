export interface RouteDefinition {
    id: string;
    label: string;
    sectionId: string;
    table?: string;
}
export declare const ROUTE_DEFINITIONS: RouteDefinition[];
export declare const ROUTE_IDS: string[];
export declare const TABLE_TO_ROUTE_ID: Record<string, string>;
export declare function getRouteLabel(routeId: string): string;
