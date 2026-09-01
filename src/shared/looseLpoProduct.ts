import {
  isLoosePalmOilName,
  isSludgeMemberName,
  SLUDGE_OIL_POOL_PRODUCT_NAME,
} from "./stockIntakeGroups.js";

export const LOOSE_LPO_PRODUCT_CODE = "LPO";

export function normalizeProductCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

export interface LooseLpoProductRef {
  productCode?: string | null;
  productName?: string | null;
  isBottled?: number | boolean | null;
}

/** True only for the canonical loose palm oil SKU (product code LPO), not sludge grades in the same category. */
export function isLooseLpoProduct(product: LooseLpoProductRef): boolean {
  if (product.isBottled === 1 || product.isBottled === true) {
    return false;
  }

  if (normalizeProductCode(product.productCode) === LOOSE_LPO_PRODUCT_CODE) {
    return true;
  }

  if (product.productName && isLoosePalmOilName(product.productName)) {
    return true;
  }

  return false;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/** True for sellable sludge member grades (report bucketing only). */
export function isSludgeMemberReportProduct(product: LooseLpoProductRef): boolean {
  if (product.isBottled === 1 || product.isBottled === true) {
    return false;
  }

  return Boolean(product.productName && isSludgeMemberName(product.productName));
}

/** True for the Sludge Oil pool product (stock/reception on reports only). */
export function isSludgePoolReportProduct(product: LooseLpoProductRef): boolean {
  if (product.isBottled === 1 || product.isBottled === true) {
    return false;
  }

  return (
    Boolean(product.productName) &&
    normalizeName(product.productName!) ===
      normalizeName(SLUDGE_OIL_POOL_PRODUCT_NAME)
  );
}

/** True for LPO report sections: canonical LPO plus sludge member grades. */
export function isLooseLpoReportProduct(product: LooseLpoProductRef): boolean {
  return isLooseLpoProduct(product) || isSludgeMemberReportProduct(product);
}
