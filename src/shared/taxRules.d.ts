export type CustomerResidency = "LOCAL" | "OVERSEAS";
export type TaxRegimeKind = "REAL" | "SIMPLIFIED";
export type TaxRateKind = "VAT" | "SALES_ACTUAL" | "SALES_SIMPLIFIED" | "SALES_NO_TAXPAYER";
export declare const TAX_REGIME_KIND_LABELS: Record<TaxRegimeKind, string>;
export declare const TAX_RATE_KIND_LABELS: Record<TaxRateKind, string>;
export declare const TAX_RATE_KINDS: TaxRateKind[];
/** Fallback when schedule is empty. */
export declare const SALES_TAX_RATE_NO_TAXPAYER = 0.1;
export declare const SALES_TAX_RATE_ACTUAL = 0.02;
export declare const SALES_TAX_RATE_SIMPLIFIED = 0.05;
export declare const DEFAULT_VAT_RATE = 0.1925;
export declare const SALES_TAX_LABEL = "Sales tax";
export interface TaxRatesBag {
    vatRate: number;
    salesActual: number;
    salesSimplified: number;
    salesNoTaxpayer: number;
}
export declare const FALLBACK_TAX_RATES: TaxRatesBag;
export declare function parseTaxRateDecimal(value: string | number | null | undefined): number;
/**
 * Accepts UI percents (e.g. 19.25) or stored decimals (e.g. 0.1925).
 * Values > 1 are treated as percent and divided by 100.
 */
export declare function normalizeVatRateDecimal(value: string | number | null | undefined): number;
/** Alias: same percent↔decimal rule for any tax rate field. */
export declare const normalizeTaxRateDecimal: typeof normalizeVatRateDecimal;
export declare function resolveVatApplies(residency: string | null | undefined): boolean;
export declare function normalizeTaxRegimeKind(kind: string | null | undefined): TaxRegimeKind;
export declare function normalizeTaxRateKind(kind: string | null | undefined): TaxRateKind | null;
export declare function hasTaxpayerCard(taxpayerId: string | null | undefined): boolean;
/**
 * Sales tax rate as a decimal multiplier.
 * No taxpayer ID → no-taxpayer rate. Otherwise Actual / Simplified from rates bag.
 */
export declare function resolveSalesTaxRate(input: {
    taxRegimeKind: string | null | undefined;
    taxpayerId: string | null | undefined;
    rates?: Partial<TaxRatesBag> | null;
}): number;
export declare function resolveCustomerTaxProfile(input: {
    residency: string | null | undefined;
    taxRegimeKind: string | null | undefined;
    taxpayerId: string | null | undefined;
    /** @deprecated Prefer rates.vatRate from loadTaxRatesAsOf */
    companyVatRate?: string | number | null | undefined;
    rates?: Partial<TaxRatesBag> | null;
}): {
    vatApplies: boolean;
    vatRate: number;
    salesTaxRate: number;
    salesTaxLabel: string;
    taxRegimeKind: TaxRegimeKind;
};
