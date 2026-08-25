/**
 * Derived sellability for stock display/reports (not a DB column).
 * Active storage locations are treated as invoice-eligible.
 */
export function isStorageLocationEffectivelySellable(args: {
  isActive?: boolean | number | null;
}): boolean {
  return (
    args.isActive === true ||
    args.isActive === 1 ||
    args.isActive == null
  );
}
