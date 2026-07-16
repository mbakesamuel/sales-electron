-- Date-effective VAT and sales-tax rates (slim schedule, no TaxType).

CREATE TABLE IF NOT EXISTS TaxRateSchedule (
  id TEXT PRIMARY KEY NOT NULL,
  rateKind TEXT NOT NULL CHECK (
    rateKind IN ('VAT', 'SALES_ACTUAL', 'SALES_SIMPLIFIED', 'SALES_NO_TAXPAYER')
  ),
  rate TEXT NOT NULL,
  effectiveFrom TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (rateKind, effectiveFrom)
);

CREATE INDEX IF NOT EXISTS TaxRateSchedule_kind_from_idx
  ON TaxRateSchedule (rateKind, effectiveFrom);

INSERT INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom)
SELECT 'tax-rate-vat-default', 'VAT', '0.1925', '1970-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM TaxRateSchedule WHERE rateKind = 'VAT' AND effectiveFrom = '1970-01-01'
);

INSERT INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom)
SELECT 'tax-rate-actual-default', 'SALES_ACTUAL', '0.02', '1970-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM TaxRateSchedule WHERE rateKind = 'SALES_ACTUAL' AND effectiveFrom = '1970-01-01'
);

INSERT INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom)
SELECT 'tax-rate-simplified-default', 'SALES_SIMPLIFIED', '0.05', '1970-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM TaxRateSchedule WHERE rateKind = 'SALES_SIMPLIFIED' AND effectiveFrom = '1970-01-01'
);

INSERT INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom)
SELECT 'tax-rate-no-taxpayer-default', 'SALES_NO_TAXPAYER', '0.10', '1970-01-01'
WHERE NOT EXISTS (
  SELECT 1 FROM TaxRateSchedule WHERE rateKind = 'SALES_NO_TAXPAYER' AND effectiveFrom = '1970-01-01'
);

-- Keep CompanySettings.vatRate aligned with the latest VAT schedule row (as of today).
UPDATE CompanySettings
SET vatRate = COALESCE(
  (
    SELECT rate FROM TaxRateSchedule
    WHERE rateKind = 'VAT' AND effectiveFrom <= date('now')
    ORDER BY effectiveFrom DESC
    LIMIT 1
  ),
  vatRate
)
WHERE id = 'default';
