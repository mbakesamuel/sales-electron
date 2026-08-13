export type CustomerResidency = "LOCAL" | "OVERSEAS";
export type TaxRegimeKind = "REAL" | "SIMPLIFIED";

export type TaxRateKind =
  | "VAT"
  | "SALES_ACTUAL"
  | "SALES_SIMPLIFIED"
  | "SALES_NO_TAXPAYER";

export const TAX_REGIME_KIND_LABELS: Record<TaxRegimeKind, string> = {
  REAL: "Actual",
  SIMPLIFIED: "Simplified",
};

export const TAX_RATE_KIND_LABELS: Record<TaxRateKind, string> = {
  VAT: "VAT",
  SALES_ACTUAL: "Sales tax — Actual",
  SALES_SIMPLIFIED: "Sales tax — Simplified",
  SALES_NO_TAXPAYER: "Sales tax — No taxpayer ID",
};

export const TAX_RATE_KINDS = Object.keys(TAX_RATE_KIND_LABELS) as TaxRateKind[];

/** Fallback when schedule is empty. */
export const SALES_TAX_RATE_NO_TAXPAYER = 0.1;
export const SALES_TAX_RATE_ACTUAL = 0.02;
export const SALES_TAX_RATE_SIMPLIFIED = 0.05;
export const DEFAULT_VAT_RATE = 0.1925;

export const SALES_TAX_LABEL = "Sales tax";

export interface TaxRatesBag {
  vatRate: number;
  salesActual: number;
  salesSimplified: number;
  salesNoTaxpayer: number;
}

export const FALLBACK_TAX_RATES: TaxRatesBag = {
  vatRate: DEFAULT_VAT_RATE,
  salesActual: SALES_TAX_RATE_ACTUAL,
  salesSimplified: SALES_TAX_RATE_SIMPLIFIED,
  salesNoTaxpayer: SALES_TAX_RATE_NO_TAXPAYER,
};

export function parseTaxRateDecimal(value: string | number | null | undefined): number {
  if (value == null || value === "") {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Accepts UI percents (e.g. 19.25) or stored decimals (e.g. 0.1925).
 * Values > 1 are treated as percent and divided by 100.
 */
export function normalizeVatRateDecimal(value: string | number | null | undefined): number {
  const parsed = parseTaxRateDecimal(value);
  if (parsed > 1) {
    return parsed / 100;
  }
  return parsed;
}

/** Alias: same percent↔decimal rule for any tax rate field. */
export const normalizeTaxRateDecimal = normalizeVatRateDecimal;

export function resolveVatApplies(residency: string | null | undefined): boolean {
  return String(residency ?? "LOCAL").toUpperCase() === "LOCAL";
}

export function normalizeTaxRegimeKind(
  kind: string | null | undefined,
): TaxRegimeKind {
  const normalized = String(kind ?? "SIMPLIFIED").toUpperCase();
  return normalized === "REAL" ? "REAL" : "SIMPLIFIED";
}

export function normalizeTaxRateKind(
  kind: string | null | undefined,
): TaxRateKind | null {
  const normalized = String(kind ?? "").toUpperCase();
  if (
    normalized === "VAT" ||
    normalized === "SALES_ACTUAL" ||
    normalized === "SALES_SIMPLIFIED" ||
    normalized === "SALES_NO_TAXPAYER"
  ) {
    return normalized;
  }
  return null;
}

export function hasTaxpayerCard(taxpayerId: string | null | undefined): boolean {
  return String(taxpayerId ?? "").trim().length > 0;
}

/**
 * Sales tax rate as a decimal multiplier.
 * No taxpayer ID → no-taxpayer rate. Otherwise Actual / Simplified from rates bag.
 */
export function resolveSalesTaxRate(input: {
  taxRegimeKind: string | null | undefined;
  taxpayerId: string | null | undefined;
  rates?: Partial<TaxRatesBag> | null;
}): number {
  const rates = { ...FALLBACK_TAX_RATES, ...input.rates };
  if (!hasTaxpayerCard(input.taxpayerId)) {
    return rates.salesNoTaxpayer;
  }
  const kind = normalizeTaxRegimeKind(input.taxRegimeKind);
  return kind === "REAL" ? rates.salesActual : rates.salesSimplified;
}

export function formatTaxLabelWithPercent(
  baseLabel: string,
  rateDecimal: string | number | null | undefined,
): string {
  const rate = normalizeTaxRateDecimal(rateDecimal);
  const percent = (rate * 100).toFixed(2);
  return `${baseLabel} (${percent}%)`;
}

export function formatTaxLabelFromAmounts(
  baseLabel: string,
  subtotalExTax: string | number,
  taxAmount: string | number,
): string {
  const subtotal = parseTaxRateDecimal(subtotalExTax);
  const tax = parseTaxRateDecimal(taxAmount);
  if (subtotal <= 0 || tax <= 0) {
    return baseLabel;
  }
  const percent = ((tax / subtotal) * 100).toFixed(2);
  return `${baseLabel} (${percent}%)`;
}

export function resolveCustomerTaxProfile(input: {
  residency: string | null | undefined;
  taxRegimeKind: string | null | undefined;
  taxpayerId: string | null | undefined;
  /** When true (customer type flagged exempt), sales tax is not applied. */
  salesTaxExempt?: boolean | null | undefined;
  /** @deprecated Prefer rates.vatRate from loadTaxRatesAsOf */
  companyVatRate?: string | number | null | undefined;
  rates?: Partial<TaxRatesBag> | null;
}): {
  vatApplies: boolean;
  vatRate: number;
  salesTaxRate: number;
  salesTaxLabel: string;
  taxRegimeKind: TaxRegimeKind;
} {
  const rates: TaxRatesBag = {
    ...FALLBACK_TAX_RATES,
    ...input.rates,
  };
  if (input.rates?.vatRate == null && input.companyVatRate != null) {
    rates.vatRate = normalizeTaxRateDecimal(input.companyVatRate);
  }

  const vatApplies = resolveVatApplies(input.residency);
  const vatRate = vatApplies ? rates.vatRate : 0;
  const taxRegimeKind = normalizeTaxRegimeKind(input.taxRegimeKind);
  const salesTaxRate = input.salesTaxExempt
    ? 0
    : resolveSalesTaxRate({
        taxRegimeKind,
        taxpayerId: input.taxpayerId,
        rates,
      });

  return {
    vatApplies,
    vatRate,
    salesTaxRate,
    salesTaxLabel: SALES_TAX_LABEL,
    taxRegimeKind,
  };
}
