ALTER TABLE TaxRateSchedule
  ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1
  CHECK (isActive IN (0, 1));

CREATE INDEX IF NOT EXISTS TaxRateSchedule_isActive_idx ON TaxRateSchedule (isActive);
