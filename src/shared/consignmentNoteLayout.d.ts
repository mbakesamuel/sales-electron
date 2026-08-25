import type { SaleDisposition } from "./sales.types.js";
export type ConsignmentNoteLayout = "bordereau" | "productsTable";
export declare function layoutForDisposition(disposition: SaleDisposition | null | undefined): ConsignmentNoteLayout;
export declare function consignmentFormTitle(disposition: SaleDisposition | null | undefined): string;
export declare function consignmentFormHint(disposition: SaleDisposition | null | undefined): string;
