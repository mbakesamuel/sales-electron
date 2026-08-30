-- Drum / small-tank locations may hold multiple bulk products.

ALTER TABLE StorageLocation ADD COLUMN allowsMultiProduct INTEGER NOT NULL DEFAULT 0
  CHECK (allowsMultiProduct IN (0, 1));

UPDATE StorageLocation
SET allowsMultiProduct = 1
WHERE locationId IN (
  SELECT id FROM Location
  WHERE LOWER(TRIM(locationName)) LIKE '%drum%'
);
