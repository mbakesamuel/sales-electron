/**
 * Derived sellability for stock display/reports (not a DB column).
 *
 * - Sales-point storage locations are treated as invoice-eligible when active.
 * - Mill-owned storage locations are sellable for display only when the mill is active;
 *   inactive mills render stock at those locations as Unsellable.
 * - Sales invoicing never uses mill-owned locations; this helper is for overlay/UI/reports.
 */
export function isStorageLocationEffectivelySellable(args: {
  millId: number | null | undefined;
  millIsActive?: boolean | number | null;
  isActive?: boolean | number | null;
}): boolean {
  const locationActive =
    args.isActive === true ||
    args.isActive === 1 ||
    args.isActive == null;

  if (!locationActive) {
    return false;
  }

  if (args.millId != null) {
    return (
      args.millIsActive === true ||
      args.millIsActive === 1 ||
      args.millIsActive == null
    );
  }

  return true;
}

/** Sales invoicing may only draw from sales-point–owned storage locations. */
export function isSalesPointOwnedStorageLocation(
  salesPointId: number | null | undefined,
): boolean {
  return salesPointId != null;
}
