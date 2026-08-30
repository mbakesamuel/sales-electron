-- Disposition-specific payment methods: Ration (deferred CREDIT) and Public relation (complimentary).

PRAGMA foreign_keys = OFF;

CREATE TABLE PaymentMethodDefinition__new (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('SIMPLE','CHEQUE','TRAITE','CREDIT','BANK_TRANSFER','PUBLIC_RELATION')),
  sortOrder INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
  isSystem INTEGER NOT NULL DEFAULT 0 CHECK (isSystem IN (0, 1)),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO PaymentMethodDefinition__new (
  id, code, name, kind, sortOrder, isActive, isSystem, createdAt, updatedAt
)
SELECT
  id, code, name, kind, sortOrder, isActive, isSystem, createdAt, updatedAt
FROM PaymentMethodDefinition;

DROP TABLE PaymentMethodDefinition;
ALTER TABLE PaymentMethodDefinition__new RENAME TO PaymentMethodDefinition;

CREATE INDEX IF NOT EXISTS PaymentMethodDefinition_active_sort_idx
  ON PaymentMethodDefinition (isActive, sortOrder);

INSERT INTO PaymentMethodDefinition (id, code, name, kind, sortOrder, isActive, isSystem)
SELECT 'sys-pm-ration', 'RATION', 'Ration (deferred)', 'CREDIT', 90, 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM PaymentMethodDefinition WHERE id = 'sys-pm-ration'
);

INSERT INTO PaymentMethodDefinition (id, code, name, kind, sortOrder, isActive, isSystem)
SELECT 'sys-pm-public-relation', 'PUBLIC_RELATION', 'Public relation (complimentary)', 'PUBLIC_RELATION', 91, 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM PaymentMethodDefinition WHERE id = 'sys-pm-public-relation'
);

UPDATE Payment
SET paymentMethodId = 'sys-pm-ration'
WHERE saleId IN (SELECT id FROM Sale WHERE saleDisposition = 'RATION');

UPDATE Payment
SET paymentMethodId = 'sys-pm-public-relation'
WHERE saleId IN (SELECT id FROM Sale WHERE saleDisposition = 'PUBLIC_RELATION');

PRAGMA foreign_keys = ON;
