-- Customer.id: TEXT -> INTEGER PRIMARY KEY AUTOINCREMENT
-- Sale.customerId and DeliveryOrder.customerId: TEXT -> INTEGER

PRAGMA foreign_keys = OFF;

CREATE TEMP TABLE _customer_old AS
SELECT
  ROW_NUMBER() OVER (ORDER BY rowid) AS seq,
  id AS old_id,
  name,
  phone,
  email,
  address,
  taxRegimeId,
  taxpayerId,
  createdAt,
  updatedAt,
  residency,
  hasTaxpayerId,
  isPosPlaceholder,
  commercialServiceId,
  customerTypeId
FROM Customer;

CREATE TABLE Customer__new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  taxRegimeId TEXT REFERENCES TaxRegime(id) ON DELETE RESTRICT,
  taxpayerId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  residency TEXT NOT NULL DEFAULT 'LOCAL' CHECK (residency IN ('LOCAL', 'OVERSEAS')),
  hasTaxpayerId INTEGER NOT NULL DEFAULT 0 CHECK (hasTaxpayerId IN (0, 1)),
  isPosPlaceholder INTEGER NOT NULL DEFAULT 0 CHECK (isPosPlaceholder IN (0, 1)),
  commercialServiceId TEXT NOT NULL REFERENCES CommercialService(id),
  customerTypeId TEXT NOT NULL REFERENCES CustomerTypeDefinition(id)
);

INSERT INTO Customer__new (
  name,
  phone,
  email,
  address,
  taxRegimeId,
  taxpayerId,
  createdAt,
  updatedAt,
  residency,
  hasTaxpayerId,
  isPosPlaceholder,
  commercialServiceId,
  customerTypeId
)
SELECT
  name,
  phone,
  email,
  address,
  taxRegimeId,
  taxpayerId,
  createdAt,
  updatedAt,
  residency,
  hasTaxpayerId,
  isPosPlaceholder,
  commercialServiceId,
  customerTypeId
FROM _customer_old
ORDER BY seq;

CREATE TEMP TABLE customer_id_map AS
SELECT
  o.old_id,
  n.id AS new_id
FROM _customer_old o
JOIN (
  SELECT ROW_NUMBER() OVER (ORDER BY id) AS seq, id
  FROM Customer__new
) n ON n.seq = o.seq;

DROP TABLE Customer;
ALTER TABLE Customer__new RENAME TO Customer;

CREATE INDEX IF NOT EXISTS Customer_name_idx ON Customer (name);
CREATE INDEX IF NOT EXISTS Customer_taxRegime_idx ON Customer (taxRegimeId);
CREATE INDEX IF NOT EXISTS Customer_commercialService_idx ON Customer (commercialServiceId);
CREATE INDEX IF NOT EXISTS Customer_customerType_idx ON Customer (customerTypeId);

CREATE TABLE Sale__customer_int (
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

INSERT INTO Sale__customer_int (
  id,
  invoiceNo,
  soldAt,
  customerId,
  createdByUserId,
  customerNameSnapshot,
  taxRegimeId,
  vatRateSnapshot,
  netAmount,
  vatAmount,
  grossAmount,
  createdAt,
  updatedAt,
  financialYear,
  financialMonth,
  referenceNumber,
  salesPointId,
  status,
  validatedAt,
  validatedByUserId,
  vehicleNumber,
  dateIssued,
  deliveryOrderNo,
  postingCalendarYear,
  commercialServiceId,
  issuerPhoneSnapshot,
  issuerAddressSnapshot,
  commercialServiceNameSnapshot,
  saleProductMode,
  saleDisposition
)
SELECT
  s.id,
  s.invoiceNo,
  s.soldAt,
  CASE
    WHEN s.customerId IS NULL OR TRIM(s.customerId) = '' THEN NULL
    ELSE COALESCE(
      (SELECT m.new_id FROM customer_id_map m WHERE m.old_id = s.customerId),
      CAST(s.customerId AS INTEGER)
    )
  END,
  s.createdByUserId,
  s.customerNameSnapshot,
  s.taxRegimeId,
  s.vatRateSnapshot,
  s.netAmount,
  s.vatAmount,
  s.grossAmount,
  s.createdAt,
  s.updatedAt,
  s.financialYear,
  s.financialMonth,
  s.referenceNumber,
  s.salesPointId,
  s.status,
  s.validatedAt,
  s.validatedByUserId,
  s.vehicleNumber,
  s.dateIssued,
  s.deliveryOrderNo,
  s.postingCalendarYear,
  s.commercialServiceId,
  s.issuerPhoneSnapshot,
  s.issuerAddressSnapshot,
  s.commercialServiceNameSnapshot,
  s.saleProductMode,
  s.saleDisposition
FROM Sale s;

DROP TABLE Sale;
ALTER TABLE Sale__customer_int RENAME TO Sale;

CREATE INDEX IF NOT EXISTS Sale_soldAt_idx ON Sale (soldAt);
CREATE INDEX IF NOT EXISTS Sale_customer_soldAt_idx ON Sale (customerId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_createdBy_soldAt_idx ON Sale (createdByUserId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_taxRegime_soldAt_idx ON Sale (taxRegimeId, soldAt);
CREATE INDEX IF NOT EXISTS Sale_fy_posting_idx ON Sale (financialYear, postingCalendarYear, financialMonth);
CREATE INDEX IF NOT EXISTS Sale_status_soldAt_idx ON Sale (status, soldAt);
CREATE INDEX IF NOT EXISTS Sale_deliveryOrderNo_idx ON Sale (deliveryOrderNo);
CREATE INDEX IF NOT EXISTS Sale_commercialService_idx ON Sale (commercialServiceId);

CREATE TABLE DeliveryOrder__customer_int (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliveryOrderNo TEXT NOT NULL UNIQUE,
  dateIssued TEXT NOT NULL,
  customerId INTEGER NOT NULL REFERENCES Customer(id),
  orderRef TEXT,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  financialYear INTEGER,
  financialMonth INTEGER,
  createdByUserId TEXT REFERENCES User(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','REJECTED')),
  validatedAt TEXT,
  validatedByUserId TEXT REFERENCES User(id),
  postingCalendarYear INTEGER,
  commercialServiceId TEXT REFERENCES CommercialService(id),
  issuerPhoneSnapshot TEXT,
  issuerAddressSnapshot TEXT,
  commercialServiceNameSnapshot TEXT,
  reviewedAt TEXT,
  reviewedByUserId TEXT REFERENCES User(id),
  cancelledAt TEXT,
  cancelledByUserId TEXT REFERENCES User(id),
  cancelReason TEXT
);

INSERT INTO DeliveryOrder__customer_int (
  id,
  deliveryOrderNo,
  dateIssued,
  customerId,
  orderRef,
  salesPointId,
  financialYear,
  financialMonth,
  createdByUserId,
  status,
  validatedAt,
  validatedByUserId,
  postingCalendarYear,
  commercialServiceId,
  issuerPhoneSnapshot,
  issuerAddressSnapshot,
  commercialServiceNameSnapshot,
  reviewedAt,
  reviewedByUserId,
  cancelledAt,
  cancelledByUserId,
  cancelReason
)
SELECT
  d.id,
  d.deliveryOrderNo,
  d.dateIssued,
  COALESCE(
    (SELECT m.new_id FROM customer_id_map m WHERE m.old_id = d.customerId),
    CAST(d.customerId AS INTEGER)
  ),
  d.orderRef,
  d.salesPointId,
  d.financialYear,
  d.financialMonth,
  d.createdByUserId,
  d.status,
  d.validatedAt,
  d.validatedByUserId,
  d.postingCalendarYear,
  d.commercialServiceId,
  d.issuerPhoneSnapshot,
  d.issuerAddressSnapshot,
  d.commercialServiceNameSnapshot,
  d.reviewedAt,
  d.reviewedByUserId,
  d.cancelledAt,
  d.cancelledByUserId,
  d.cancelReason
FROM DeliveryOrder d;

DROP TABLE DeliveryOrder;
ALTER TABLE DeliveryOrder__customer_int RENAME TO DeliveryOrder;

CREATE INDEX IF NOT EXISTS DeliveryOrder_customer_idx ON DeliveryOrder (customerId);
CREATE INDEX IF NOT EXISTS DeliveryOrder_salesPoint_idx ON DeliveryOrder (salesPointId);
CREATE INDEX IF NOT EXISTS DeliveryOrder_fy_posting_idx ON DeliveryOrder (financialYear, postingCalendarYear, financialMonth);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_date_idx ON DeliveryOrder (status, dateIssued);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_reviewed_idx ON DeliveryOrder (status, reviewedAt);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_cancelled_idx ON DeliveryOrder (status, cancelledAt);
CREATE INDEX IF NOT EXISTS DeliveryOrder_commercialService_idx ON DeliveryOrder (commercialServiceId);

PRAGMA foreign_keys = ON;
