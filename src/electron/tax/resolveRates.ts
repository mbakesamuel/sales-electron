import {
  FALLBACK_TAX_RATES,
  normalizeTaxRateDecimal,
  type TaxRateKind,
  type TaxRatesBag,
} from "../../shared/taxRules.js";
import { getDatabase } from "../db/index.js";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAsOfDate(asOfDate: string | null | undefined): string {
  const trimmed = String(asOfDate ?? "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return todayIsoDate();
}

function loadRateKindAsOf(rateKind: TaxRateKind, asOfDate: string): number | null {
  const row = getDatabase()
    .prepare(
      `SELECT rate FROM TaxRateSchedule
       WHERE rateKind = ?
         AND effectiveFrom <= ?
       ORDER BY effectiveFrom DESC
       LIMIT 1`,
    )
    .get(rateKind, asOfDate) as { rate: string } | undefined;

  if (!row) {
    return null;
  }

  return normalizeTaxRateDecimal(row.rate);
}

/**
 * Latest scheduled rates with effectiveFrom <= asOfDate.
 * Falls back to hardcoded defaults when a kind has no row.
 */
export function loadTaxRatesAsOf(asOfDate?: string | null): TaxRatesBag {
  const asOf = normalizeAsOfDate(asOfDate);

  return {
    vatRate: loadRateKindAsOf("VAT", asOf) ?? FALLBACK_TAX_RATES.vatRate,
    salesActual: loadRateKindAsOf("SALES_ACTUAL", asOf) ?? FALLBACK_TAX_RATES.salesActual,
    salesSimplified:
      loadRateKindAsOf("SALES_SIMPLIFIED", asOf) ?? FALLBACK_TAX_RATES.salesSimplified,
    salesNoTaxpayer:
      loadRateKindAsOf("SALES_NO_TAXPAYER", asOf) ?? FALLBACK_TAX_RATES.salesNoTaxpayer,
  };
}

/** Sync CompanySettings.vatRate from the latest VAT schedule row as of today. */
export function syncCompanyVatRateFromSchedule(): void {
  const rates = loadTaxRatesAsOf(todayIsoDate());
  const db = getDatabase();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  db.prepare(
    `UPDATE CompanySettings
     SET vatRate = ?, updatedAt = ?
     WHERE id = 'default'`,
  ).run(String(rates.vatRate), now);
}
