export interface SchemaRoute {
    id: string;
    label: string;
    table: string;
    description: string;
}
export interface SchemaRouteSection {
    id: string;
    label: string;
    routes: SchemaRoute[];
}
export declare const SCHEMA_ROUTE_SECTIONS: SchemaRouteSection[];
export declare const DEFAULT_ROUTE_ID = "overview";
export declare const OVERVIEW_ROUTE: SchemaRoute;
export declare function findRouteById(routeId: string): SchemaRoute | null;
export declare function getSectionIdForRoute(routeId: string): string | null;
