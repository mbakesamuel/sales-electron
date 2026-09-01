export declare const LOOSE_LPO_PRODUCT_CODE = "LPO";
export declare function normalizeProductCode(code: string | null | undefined): string;
export interface LooseLpoProductRef {
    productCode?: string | null;
    productName?: string | null;
    isBottled?: number | boolean | null;
}
/** True only for the canonical loose palm oil SKU (product code LPO), not sludge grades in the same category. */
export declare function isLooseLpoProduct(product: LooseLpoProductRef): boolean;
/** True for sellable sludge member grades (report bucketing only). */
export declare function isSludgeMemberReportProduct(product: LooseLpoProductRef): boolean;
/** True for the Sludge Oil pool product (stock/reception on reports only). */
export declare function isSludgePoolReportProduct(product: LooseLpoProductRef): boolean;
/** True for LPO report sections: canonical LPO plus sludge member grades. */
export declare function isLooseLpoReportProduct(product: LooseLpoProductRef): boolean;
