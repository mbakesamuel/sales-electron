-- Allow PALM_KERNEL in stockIntakeGroup (SQLite cannot widen CHECK in place).

ALTER TABLE Product DROP COLUMN stockIntakeGroup;
ALTER TABLE Product ADD COLUMN stockIntakeGroup TEXT
  CHECK (stockIntakeGroup IS NULL OR stockIntakeGroup IN ('PALM_OIL', 'SLUDGE_OIL', 'PALM_KERNEL'));
