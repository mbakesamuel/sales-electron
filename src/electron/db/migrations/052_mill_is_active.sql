-- Mills can be marked active or inactive.
ALTER TABLE Mill
  ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1
  CHECK (isActive IN (0, 1));

CREATE INDEX IF NOT EXISTS Mill_isActive_idx ON Mill (isActive);
