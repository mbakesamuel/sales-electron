ALTER TABLE StorageLocation
  ADD COLUMN isSalesTank INTEGER NOT NULL DEFAULT 0
  CHECK (isSalesTank IN (0, 1));

CREATE INDEX IF NOT EXISTS StorageLocation_isSalesTank_idx ON StorageLocation (isSalesTank);
