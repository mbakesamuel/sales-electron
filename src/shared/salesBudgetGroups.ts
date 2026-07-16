/** Budget lines aligned with monthly delivery (Jan–Jun / Jul–Dec) budget sections. */

export type SalesBudgetGroupId =
  | "uncracked"
  | "cracked"
  | "palm_oil"
  | "bottled_palm_oil"
  | "pko"
  | "pkc";

export interface SalesBudgetGroupDef {
  id: SalesBudgetGroupId;
  label: string;
  /** Short label used in monthly delivery budget table headers. */
  tonsLabel: string;
  valueLabel: string;
}

export const SALES_BUDGET_GROUPS: readonly SalesBudgetGroupDef[] = [
  {
    id: "uncracked",
    label: "Uncracked palm kernel",
    tonsLabel: "Uncracked p.k(Tons)",
    valueLabel: "Uncracked p.k(FCFA)",
  },
  {
    id: "cracked",
    label: "Cracked palm kernel",
    tonsLabel: "cracked p.k(Tons)",
    valueLabel: "cracked p.k(FCFA)",
  },
  {
    id: "palm_oil",
    label: "Palm oil (loose)",
    tonsLabel: "PALM OIL (TONS)",
    valueLabel: "PALM OIL (FCFA)",
  },
  {
    id: "bottled_palm_oil",
    label: "Bottled palm oil",
    tonsLabel: "B.P.O (TONS)",
    valueLabel: "B.P.O (FCFA)",
  },
  {
    id: "pko",
    label: "Palm kernel oil (PKO)",
    tonsLabel: "P. KERNEL OIL (TONS)",
    valueLabel: "P. KERNEL OIL (FCFA)",
  },
  {
    id: "pkc",
    label: "Palm kernel cake (PKC)",
    tonsLabel: "P.KERNEL CAKE(tons)",
    valueLabel: "PKC (FCFA)",
  },
] as const;

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

function categoryText(category: SalesBudgetCategoryRef): string {
  return category.productCat.toUpperCase();
}

function productText(
  product: SalesBudgetProductRef,
  categories: SalesBudgetCategoryRef[],
): string {
  const category = categories.find((item) => item.productCatId === product.productCatId);
  return `${product.productName} ${product.productCode ?? ""} ${category?.productCat ?? ""}`.toUpperCase();
}

function isSludgeCategory(category: SalesBudgetCategoryRef): boolean {
  return categoryText(category).includes("SLUDGE");
}

function isPalmOilLooseCategory(category: SalesBudgetCategoryRef): boolean {
  if (category.isMain === 1) {
    return true;
  }
  const text = categoryText(category);
  return (
    text.includes("PALM OIL") &&
    !text.includes("KERNEL") &&
    !text.includes("SLUDGE") &&
    category.isBottled !== 1
  );
}

function isPkoMatch(text: string): boolean {
  return text.includes("KERNEL OIL") || text.includes("PKO") || /\bPKO\b/.test(text);
}

function isPkcMatch(text: string): boolean {
  return text.includes("KERNEL CAKE") || text.includes("PKC") || /\bPKC\b/.test(text);
}

function isUncrackedMatch(text: string): boolean {
  return text.includes("UNCRACKED");
}

function isCrackedMatch(text: string): boolean {
  return text.includes("CRACKED") && !text.includes("UNCRACKED");
}

/** Product ids that roll into a monthly-delivery budget metric. */
export function resolveSalesBudgetGroupProductIds(
  groupId: SalesBudgetGroupId,
  categories: SalesBudgetCategoryRef[],
  products: SalesBudgetProductRef[],
): number[] {
  const sludgeCatIds = new Set(
    categories.filter(isSludgeCategory).map((category) => category.productCatId),
  );
  const loosePalmCatIds = new Set(
    categories.filter(isPalmOilLooseCategory).map((category) => category.productCatId),
  );

  const ids = products
    .filter((product) => {
      const text = productText(product, categories);
      const isBottled = product.isBottled === 1;
      switch (groupId) {
        case "palm_oil":
          // Loose / main palm oil + sludge only — bottled is budgeted separately.
          return (
            !isBottled &&
            (loosePalmCatIds.has(product.productCatId) ||
              sludgeCatIds.has(product.productCatId))
          );
        case "bottled_palm_oil":
          return isBottled;
        case "pko":
          return isPkoMatch(text);
        case "pkc":
          return isPkcMatch(text);
        case "uncracked":
          return isUncrackedMatch(text);
        case "cracked":
          return isCrackedMatch(text);
        default:
          return false;
      }
    })
    .map((product) => product.productId);

  return [...new Set(ids)].sort((a, b) => a - b);
}

/** Stable product used to persist a group budget / phase profile. */
export function canonicalProductIdForGroup(productIds: number[]): number | null {
  if (productIds.length === 0) return null;
  return productIds[0] ?? null;
}
