-- Allow sales with invoice-only customers (no Customer row).
-- Remove demo system customers from the Customer table.

PRAGMA foreign_keys = OFF;

UPDATE Sale
SET customerId = NULL
WHERE customerId IN ('seed-cust-002', 'seed-cust-ration', 'seed-cust-pr');

DELETE FROM Customer
WHERE id IN ('seed-cust-002', 'seed-cust-ration', 'seed-cust-pr');

CREATE TABLE Sale__invoice_only (
  id TEXT PRIMARY KEY NOT NULL,
  invoiceNo TEXT NOT NULL UNIQUE,
  soldAt TEXT NOT NULL DEFAULT (datetime('now')),
  customerId INTEGER REFERENCES Customer(id),
  createdByUserId TEXT NOT NULL REFERENCES User(id),
  customerNameSnapshot TEXT NOT NULL,
  taxRegimeId TEXT REFERENCES TaxRegime(id) ON DELETE RESTRICT,
  vatRateSnapshot TEXT NOT NULL,
  netAmount TEXT NOT NULL,
  vatAmount TEXT NOT NULL,
  grossAmount TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  financialYear INTEGER,
  financialMonth INTEGER,
  referenceNumber TEXT,
  salesPointId INTEGER REFERENCES SalesPoint(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','REJECTED')),
  validatedAt TEXT,
  validatedByUserId TEXT REFERENCES User(id),
  vehicleNumber TEXT NOT NULL,
  dateIssued TEXT NOT NULL,
  deliveryOrderNo TEXT,
  postingCalendarYear INTEGER,
  commercialServiceId TEXT REFERENCES CommercialService(id),
  issuerPhoneSnapshot TEXT,
  issuerAddressSnapshot TEXT,
  commercialServiceNameSnapshot TEXT,
  saleProductMode TEXT CHECK (saleProductMode IS NULL OR saleProductMode IN ('LOOSE','BOTTLE')),
  saleDisposition TEXT DEFAULT 'NORMAL' CHECK (saleDisposition IS NULL OR saleDisposition IN ('NORMAL','RATION','PUBLIC_RELATION'))
);

INSERT INTO Sale__invoice_only (
  id, invoiceNo, soldAt, customerId, createdByUserId, customerNameSnapshot,
  taxRegimeId, vatRateSnapshot, netAmount, vatAmount, grossAmount,
  createdAt, updatedAt, financialYear, financialMonth, referenceNumber,
  salesPointId, status, validatedAt, validatedByUserId, vehicleNumber,
  dateIssued, deliveryOrderNo, postingCalendarYear, commercialServiceId,
  issuerPhoneSnapshot, issuerAddressSnapshot, commercialServiceNameSnapshot,
  saleProductMode, saleDisposition
)
SELECT
  id, invoiceNo, soldAt, customerId, createdByUserId, customerNameSnapshot,
  taxRegimeId, vatRateSnapshot, netAmount, vatAmount, grossAmount,
  createdAt, updatedAt, financialYear, financialMonth, referenceNumber,
  salesPointId, status, validatedAt, validatedByUserId, vehicleNumber,
  dateIssued, deliveryOrderNo, postingCalendarYear, commercialServiceId,
  issuerPhoneSnapshot, issuerAddressSnapshot, commercialServiceNameSnapshot,
  saleProductMode, saleDisposition
FROM Sale;

DROP TABLE Sale;
ALTER TABLE Sale__invoice_only RENAME TO Sale;

CREATE INDEX IF NOT EXISTS Sale_soldAt_idx ON Sale (soldAt);
CREATE INDEX IF NOT EXISTS Sale_customer_soldAt_idx ON Sale (customerId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_createdBy_soldAt_idx ON Sale (createdByUserId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_taxRegime_soldAt_idx ON Sale (taxRegimeId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_fy_posting_idx ON Sale (financialYear, postingCalendarYear, financialMonth);
CREATE INDEX IF NOT EXISTS Sale_status_soldAt_idx ON Sale (status, soldAt);
CREATE INDEX IF NOT EXISTS Sale_deliveryOrderNo_idx ON Sale (deliveryOrderNo);
CREATE INDEX IF NOT EXISTS Sale_commercialService_idx ON Sale (commercialServiceId);

PRAGMA foreign_keys = ON;
