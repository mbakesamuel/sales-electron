/** Budget lines aligned with monthly delivery (Jan–Jun / Jul–Dec) budget sections. */
export type SalesBudgetGroupId = "uncracked" | "cracked" | "palm_oil" | "bottled_palm_oil" | "pko" | "pkc";
export interface SalesBudgetGroupDef {
    id: SalesBudgetGroupId;
    label: string;
    /** Short label used in monthly delivery budget table headers. */
    tonsLabel: string;
    valueLabel: string;
}
export declare const SALES_BUDGET_GROUPS: readonly SalesBudgetGroupDef[];
export interface SalesBudgetCategoryRef {
    productCatId: number;
    productCat: string;
    isMain: number;
    isBottled: number;
}
export interface SalesBudgetProductRef {
    productId: number;
    productName: string;
    productCode: string | null;
    productCatId: number;
    isBottled?: number;
}
/** Product ids that roll into a monthly-delivery budget metric. */
export declare function resolveSalesBudgetGroupProductIds(groupId: SalesBudgetGroupId, categories: SalesBudgetCategoryRef[], products: SalesBudgetProductRef[]): number[];
/** Stable product used to persist a group budget / phase profile. */
export declare function canonicalProductIdForGroup(productIds: number[]): number | null;
