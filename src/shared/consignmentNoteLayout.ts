import type { SaleDisposition } from "./sales.types.js";

export type ConsignmentNoteLayout = "bordereau" | "productsTable";

export function layoutForDisposition(
  disposition: SaleDisposition | null | undefined,
): ConsignmentNoteLayout {
  if (disposition === "RATION" || disposition === "PUBLIC_RELATION") {
    return "productsTable";
  }
  return "bordereau";
}

export function consignmentFormTitle(
  disposition: SaleDisposition | null | undefined,
): string {
  if (disposition === "RATION") {
    return "Vehicle consignment note (Ration)";
  }
  if (disposition === "PUBLIC_RELATION") {
    return "Vehicle consignment note (Public relation)";
  }
  return "Vehicle consignment note (Bordereau de Livraison)";
}

export function consignmentFormHint(
  disposition: SaleDisposition | null | undefined,
): string {
  if (disposition === "RATION" || disposition === "PUBLIC_RELATION") {
    return "Prepare a consignment note for a validated Ration or Public relation sale. Product lines come from the sale invoice.";
  }
  return "Prepare a Bordereau de Livraison for a validated sale with a delivery order. Quantities reflect paid, lifted, and balance on the DO.";
}
