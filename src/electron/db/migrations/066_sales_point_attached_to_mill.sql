ALTER TABLE SalesPoint
  ADD COLUMN attachedToMill INTEGER NOT NULL DEFAULT 0
  CHECK (attachedToMill IN (0, 1));

CREATE INDEX IF NOT EXISTS SalesPoint_attachedToMill_idx ON SalesPoint (attachedToMill);
