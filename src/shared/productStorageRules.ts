/** Category codes that do not use storage locations or location-based inventory. */
export const STORAGE_OMIT_PRODUCT_CAT_CODES = ["PKCP", "PKP"] as const;

export type StorageOmitProductCatCode =
  (typeof STORAGE_OMIT_PRODUCT_CAT_CODES)[number];

export function normalizeProductCatCode(
  productCode: string | null | undefined,
): string {
  return String(productCode ?? "")
    .trim()
    .toUpperCase();
}

/** True when the product category code is PKCP or PKP. */
export function productOmitsStorageLocation(
  productCode: string | null | undefined,
): boolean {
  const code = normalizeProductCatCode(productCode);
  return (STORAGE_OMIT_PRODUCT_CAT_CODES as readonly string[]).includes(code);
}

/**
 * User-facing message when PKCP/PKP products are used in location-bound stock docs.
 */
export const STORAGE_OMIT_STOCK_DOC_ERROR =
  "Palm Kernel / Cake products do not use storage locations.";
