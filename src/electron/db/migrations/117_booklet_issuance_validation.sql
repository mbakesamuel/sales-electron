-- Document booklet issuance validation workflow.
-- Adds PENDING and REJECTED statuses, plus validation tracking columns (validatedAt, validatedByUserId).
-- Seeds validate_document_booklets permission and booklet-validation route.

PRAGMA foreign_keys = OFF;

CREATE TABLE DocumentBooklet__new (
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

INSERT INTO DocumentBooklet__new (
  id,
  documentKind,
  bookletCode,
  startSerial,
  endSerial,
  salesPointId,
  status,
  issuedAt,
  issuedByUserId,
  validatedAt,
  validatedByUserId,
  notes,
  createdAt,
  updatedAt
)
SELECT
  id,
  documentKind,
  bookletCode,
  startSerial,
  endSerial,
  salesPointId,
  status,
  issuedAt,
  issuedByUserId,
  CASE WHEN status = 'ACTIVE' THEN issuedAt ELSE NULL END,
  CASE WHEN status = 'ACTIVE' THEN issuedByUserId ELSE NULL END,
  notes,
  createdAt,
  updatedAt
FROM DocumentBooklet;

DROP TABLE DocumentBooklet;
ALTER TABLE DocumentBooklet__new RENAME TO DocumentBooklet;

CREATE INDEX IF NOT EXISTS idx_DocumentBooklet_kind_sp_status
  ON DocumentBooklet (documentKind, salesPointId, status);

CREATE INDEX IF NOT EXISTS idx_DocumentBooklet_kind_serials
  ON DocumentBooklet (documentKind, startSerial, endSerial);

CREATE INDEX IF NOT EXISTS idx_DocumentBooklet_status
  ON DocumentBooklet (status);

PRAGMA foreign_keys = ON;

-- Permissions for booklet validation
INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('ADMIN', 'booklet-validation', 'WRITE'),
  ('MANAGER', 'booklet-validation', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'booklet-validation', 'WRITE'),
  ('STATISTICS_CLERK', 'booklet-validation', 'READ');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId = 'booklet-validation'
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR');

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
VALUES
  ('ADMIN', 'validate_document_booklets', 1),
  ('MANAGER', 'validate_document_booklets', 1),
  ('SENIOR_SALES_SUPERVISOR', 'validate_document_booklets', 1),
  ('STATISTICS_CLERK', 'validate_document_booklets', 0),
  ('STORE_KEEPER', 'validate_document_booklets', 0);

UPDATE RoleActionPermission
SET allowed = 1
WHERE actionKey = 'validate_document_booklets'
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR');
