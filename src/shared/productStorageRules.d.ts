/** Category codes that do not use storage locations or location-based inventory. */
export declare const STORAGE_OMIT_PRODUCT_CAT_CODES: readonly ["PKCP", "PKP"];
export type StorageOmitProductCatCode = (typeof STORAGE_OMIT_PRODUCT_CAT_CODES)[number];
export declare function normalizeProductCatCode(productCode: string | null | undefined): string;
/** True when the product category code is PKCP or PKP. */
export declare function productOmitsStorageLocation(productCode: string | null | undefined): boolean;
/**
 * User-facing message when PKCP/PKP products are used in location-bound stock docs.
 */
export declare const STORAGE_OMIT_STOCK_DOC_ERROR = "Palm Kernel / Cake products do not use storage locations.";
