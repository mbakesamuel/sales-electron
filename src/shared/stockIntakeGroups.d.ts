import type { ProductOption, StockBalanceRow } from "./stock.types.ts";
export type StockIntakeGroup = "PALM_OIL" | "SLUDGE_OIL" | "PALM_KERNEL";
export declare const SLUDGE_OIL_POOL_PRODUCT_NAME = "Sludge Oil";
export declare const SLUDGE_MEMBER_PRODUCT_NAMES: readonly ["Bottom Tank Oil Grade A", "Palm Sludge Oil Grade B", "Palm Sludge Oil Grade C"];
export declare const PALM_KERNEL_POOL_PRODUCT_NAME = "Palm Kernel";
export declare const PALM_KERNEL_MEMBER_PRODUCT_NAMES: readonly ["Cracked Palm Kernel", "Uncracked Palm Kernel"];
export declare const LOOSE_PALM_OIL_PRODUCT_NAME = "Loose Palm Oil";
/** Stock vs commitment report section title for pooled sludge member grades. */
export declare const PALM_SLUDGE_OIL_REPORT_BUCKET_NAME = "Palm Sludge Oil";
export interface IntakeProductGroup {
    key: string;
    label: string;
    products: ProductOption[];
}
export declare function isSludgeMemberName(productName: string): boolean;
export declare function isLoosePalmOilName(productName: string): boolean;
/** Products selectable in stock modules when grouping may apply. */
export declare function filterStockModuleProducts(products: ProductOption[], groupingEnabled: boolean): ProductOption[];
/** Products shown in bulk receipt picker. */
export declare function filterReceiptPickerProducts(products: ProductOption[], groupingEnabled: boolean): ProductOption[];
export declare function filterOnHandForStockModule(onHand: StockBalanceRow[], products: ProductOption[], groupingEnabled: boolean): StockBalanceRow[];
export declare function receiptIntakeDisplayName(product: ProductOption): string;
export declare function buildReceiptIntakeGroups(products: ProductOption[]): IntakeProductGroup[];
/** Map pooled member SKU to pool product when grouping is on. */
export declare function resolveIntakeProductId(productId: string, product: Pick<ProductOption, "stockPoolProductId"> | undefined, groupingEnabled: boolean): string;
export declare function isStockPoolProduct(product: Pick<ProductOption, "excludeFromSales" | "stockPoolProductId" | "stockIntakeGroup">): boolean;
