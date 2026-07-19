/** Sales budget helpers keyed by ProductCat (one budget row per category). */
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
}
export interface SalesBudgetCategoryDef {
    productCatId: number;
    label: string;
    /** Short label used in monthly delivery budget table headers. */
    tonsLabel: string;
    valueLabel: string;
}
/** Categories ordered for budget UI / monthly delivery: main first, then bottled last within name sort. */
export declare function sortSalesBudgetCategories(categories: SalesBudgetCategoryRef[]): SalesBudgetCategoryRef[];
/** Categories that have at least one product (default budget row set). */
export declare function salesBudgetCategoriesWithProducts(categories: SalesBudgetCategoryRef[], products: SalesBudgetProductRef[]): SalesBudgetCategoryRef[];
/**
 * Palm-kernel (uncracked/cracked) categories shown in the MDR kernel budget table
 * (no G.TOTAL). Excludes PKO / PKC / palm oil.
 */
export declare function isKernelPkBudgetCategory(category: SalesBudgetCategoryRef): boolean;
export declare function budgetCategoryLabels(category: SalesBudgetCategoryRef): {
    label: string;
    tonsLabel: string;
    valueLabel: string;
};
export declare function toSalesBudgetCategoryDef(category: SalesBudgetCategoryRef): SalesBudgetCategoryDef;
/** Product ids that roll into a category’s actuals. */
export declare function productIdsForCategory(productCatId: number, products: SalesBudgetProductRef[]): number[];
