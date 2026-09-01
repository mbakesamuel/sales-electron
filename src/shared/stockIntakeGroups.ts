import type { ProductOption, StockBalanceRow } from "./stock.types.ts";

export type StockIntakeGroup = "PALM_OIL" | "SLUDGE_OIL" | "PALM_KERNEL";

export const SLUDGE_OIL_POOL_PRODUCT_NAME = "Sludge Oil";

export const SLUDGE_MEMBER_PRODUCT_NAMES = [
  "Bottom Tank Oil Grade A",
  "Palm Sludge Oil Grade B",
  "Palm Sludge Oil Grade C",
] as const;

export const PALM_KERNEL_POOL_PRODUCT_NAME = "Palm Kernel";

export const PALM_KERNEL_MEMBER_PRODUCT_NAMES = [
  "Cracked Palm Kernel",
  "Uncracked Palm Kernel",
] as const;

export const LOOSE_PALM_OIL_PRODUCT_NAME = "Loose Palm Oil";

/** Stock vs commitment report section title for pooled sludge member grades. */
export const PALM_SLUDGE_OIL_REPORT_BUCKET_NAME = "Palm Sludge Oil";

const POOL_DISPLAY_NAMES: Record<Exclude<StockIntakeGroup, "PALM_OIL">, string> = {
  SLUDGE_OIL: SLUDGE_OIL_POOL_PRODUCT_NAME,
  PALM_KERNEL: PALM_KERNEL_POOL_PRODUCT_NAME,
};

export interface IntakeProductGroup {
  key: string;
  label: string;
  products: ProductOption[];
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function isSludgeMemberName(productName: string): boolean {
  const normalized = normalizeName(productName);
  return SLUDGE_MEMBER_PRODUCT_NAMES.some(
    (name) => normalizeName(name) === normalized,
  );
}

export function isLoosePalmOilName(productName: string): boolean {
  return normalizeName(productName) === normalizeName(LOOSE_PALM_OIL_PRODUCT_NAME);
}

/** Products selectable in stock modules when grouping may apply. */
export function filterStockModuleProducts(
  products: ProductOption[],
  groupingEnabled: boolean,
): ProductOption[] {
  const withoutSalesExcluded = products.filter((product) => !product.excludeFromSales);
  if (!groupingEnabled) {
    return withoutSalesExcluded;
  }
  return withoutSalesExcluded.filter((product) => !product.stockPoolProductId);
}

/** Products shown in bulk receipt picker. */
export function filterReceiptPickerProducts(
  products: ProductOption[],
  groupingEnabled: boolean,
): ProductOption[] {
  if (!groupingEnabled) {
    return products.filter((product) => !product.excludeFromSales);
  }
  return products.filter((product) => !product.stockPoolProductId);
}

export function filterOnHandForStockModule(
  onHand: StockBalanceRow[],
  products: ProductOption[],
  groupingEnabled: boolean,
): StockBalanceRow[] {
  const productById = new Map(products.map((product) => [product.productId, product]));
  return onHand.filter((row) => {
    const product = productById.get(row.productId);
    if (!product) {
      return true;
    }
    if (product.excludeFromSales) {
      return false;
    }
    if (groupingEnabled && product.stockPoolProductId) {
      return false;
    }
    return true;
  });
}

export function receiptIntakeDisplayName(product: ProductOption): string {
  if (
    product.isStockPool &&
    product.stockIntakeGroup &&
    product.stockIntakeGroup !== "PALM_OIL"
  ) {
    return POOL_DISPLAY_NAMES[product.stockIntakeGroup];
  }
  return product.productName;
}

export function buildReceiptIntakeGroups(
  products: ProductOption[],
): IntakeProductGroup[] {
  const filtered = filterReceiptPickerProducts(products, true);
  const palmOil = filtered.filter((product) => product.stockIntakeGroup === "PALM_OIL");
  const sludgeOil = filtered.filter(
    (product) => product.stockIntakeGroup === "SLUDGE_OIL" && product.isStockPool,
  );
  const palmKernel = filtered.filter(
    (product) => product.stockIntakeGroup === "PALM_KERNEL" && product.isStockPool,
  );
  const other = filtered.filter(
    (product) =>
      product.stockIntakeGroup !== "PALM_OIL" &&
      !(product.stockIntakeGroup === "SLUDGE_OIL" && product.isStockPool) &&
      !(product.stockIntakeGroup === "PALM_KERNEL" && product.isStockPool),
  );

  const groups: IntakeProductGroup[] = [];
  if (palmOil.length > 0) {
    groups.push({ key: "palm_oil", label: "Palm Oil", products: palmOil });
  }
  if (sludgeOil.length > 0) {
    groups.push({ key: "sludge_oil", label: "Sludge Oil", products: sludgeOil });
  }
  if (palmKernel.length > 0) {
    groups.push({ key: "palm_kernel", label: "Palm Kernel", products: palmKernel });
  }
  if (other.length > 0) {
    groups.push({ key: "other", label: "Other", products: other });
  }
  return groups;
}

/** Map pooled member SKU to pool product when grouping is on. */
export function resolveIntakeProductId(
  productId: string,
  product:
    | Pick<ProductOption, "stockPoolProductId">
    | undefined,
  groupingEnabled: boolean,
): string {
  if (groupingEnabled && product?.stockPoolProductId) {
    return String(product.stockPoolProductId);
  }
  return productId;
}

export function isStockPoolProduct(
  product: Pick<
    ProductOption,
    "excludeFromSales" | "stockPoolProductId" | "stockIntakeGroup"
  >,
): boolean {
  return (
    Boolean(product.excludeFromSales) &&
    product.stockPoolProductId == null &&
    product.stockIntakeGroup != null
  );
}
