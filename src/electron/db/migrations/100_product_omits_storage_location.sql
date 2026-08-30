-- Per-product flag: stock tracked at collection-point level (no storage location).

ALTER TABLE Product ADD COLUMN omitsStorageLocation INTEGER NOT NULL DEFAULT 0
  CHECK (omitsStorageLocation IN (0, 1));

UPDATE Product
SET omitsStorageLocation = 1
WHERE productCatId IN (
  SELECT productCatId FROM ProductCat
  WHERE UPPER(TRIM(productCode)) IN ('PKCP', 'PKP')
);
