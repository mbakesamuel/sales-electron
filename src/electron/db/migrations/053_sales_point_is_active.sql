-- Sales points can be marked active or inactive.
ALTER TABLE SalesPoint
  ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1
  CHECK (isActive IN (0, 1));

CREATE INDEX IF NOT EXISTS SalesPoint_isActive_idx ON SalesPoint (isActive);
