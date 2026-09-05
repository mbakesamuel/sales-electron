-- Document booklet registry for sales invoices and delivery orders issued to collection points.
-- Adds CompanySettings toggles to enforce strict booklet validation on manual entry.

CREATE TABLE IF NOT EXISTS DocumentBooklet (
  id TEXT PRIMARY KEY NOT NULL,
  documentKind TEXT NOT NULL CHECK (documentKind IN ('SALES_INVOICE', 'DELIVERY_ORDER')),
  bookletCode TEXT,
  startSerial TEXT NOT NULL,
  endSerial TEXT NOT NULL,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELLED', 'REJECTED')) DEFAULT 'PENDING',
  issuedAt TEXT NOT NULL DEFAULT (datetime('now')),
  issuedByUserId TEXT REFERENCES User(id),
  validatedAt TEXT,
  validatedByUserId TEXT REFERENCES User(id),
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_DocumentBooklet_kind_sp_status
  ON DocumentBooklet (documentKind, salesPointId, status);

CREATE INDEX IF NOT EXISTS idx_DocumentBooklet_kind_serials
  ON DocumentBooklet (documentKind, startSerial, endSerial);

ALTER TABLE CompanySettings ADD COLUMN enforceSalesInvoiceBookletValidation INTEGER NOT NULL DEFAULT 0;
ALTER TABLE CompanySettings ADD COLUMN enforceDeliveryOrderBookletValidation INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'document-booklets', access
FROM RoleRoutePermission
WHERE routeId = 'sales-validation';
