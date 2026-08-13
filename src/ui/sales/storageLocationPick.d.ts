import type { SalesStorageLocationBalanceOption } from "./types.ts";
export declare function locationCoversQty(rows: SalesStorageLocationBalanceOption[], storageLocationId: string, requiredQty: number): boolean;
/**
 * Prefer preferredLocationId when it has enough stock; else first by list order
 * (already sorted by location name) that can cover requiredQty.
 */
export declare function pickLocationForQty(rows: SalesStorageLocationBalanceOption[], requiredQty: number, preferredLocationId?: string | null): string;
