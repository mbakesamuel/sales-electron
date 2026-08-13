-- Allow BANK_TRANSFER payment method kind (Method + Date + Bank on delivery orders).

PRAGMA foreign_keys = OFF;

CREATE TABLE PaymentMethodDefinition__new (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('SIMPLE','CHEQUE','TRAITE','CREDIT','BANK_TRANSFER')),
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
SELECT 'seed-pm-bank-transfer', 'BANK_TRANSFER', 'Bank Transfer', 'BANK_TRANSFER', 2, 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM PaymentMethodDefinition WHERE code = 'BANK_TRANSFER'
);

PRAGMA foreign_keys = ON;
