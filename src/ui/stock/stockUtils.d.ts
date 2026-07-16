import type { StorageLocationOption } from "../../shared/stock.types.ts";
export declare function formatDateTime(iso: string | null | undefined): string;
export declare function formatDate(iso: string | null | undefined): string;
export declare function trimQty(qty: string): string;
export declare function locationsForSalesPoint(storageLocations: StorageLocationOption[], salesPointId: string | number): StorageLocationOption[];
export declare function defaultLocationId(storageLocations: StorageLocationOption[], salesPointId: string | number): string;
export declare function utcIsoDateToday(): string;
