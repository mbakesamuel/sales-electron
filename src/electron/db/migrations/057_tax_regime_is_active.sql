ALTER TABLE TaxRegime
  ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1
  CHECK (isActive IN (0, 1));

CREATE INDEX IF NOT EXISTS TaxRegime_isActive_idx ON TaxRegime (isActive);
