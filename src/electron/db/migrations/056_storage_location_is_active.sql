ALTER TABLE StorageLocation
  ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1
  CHECK (isActive IN (0, 1));

CREATE INDEX IF NOT EXISTS StorageLocation_isActive_idx ON StorageLocation (isActive);
