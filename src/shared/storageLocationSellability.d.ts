/**
 * Derived sellability for stock display/reports (not a DB column).
 * Active storage locations are treated as invoice-eligible.
 */
export declare function isStorageLocationEffectivelySellable(args: {
    isActive?: boolean | number | null;
}): boolean;
