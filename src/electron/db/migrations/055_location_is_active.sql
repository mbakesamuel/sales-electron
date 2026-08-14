ALTER TABLE Location
  ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1
  CHECK (isActive IN (0, 1));

CREATE INDEX IF NOT EXISTS Location_isActive_idx ON Location (isActive);
