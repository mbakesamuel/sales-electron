-- Palm Oil / Sludge Oil stock intake grouping (behaviour gated by CompanySettings.stockIntakeOilGrouping).

ALTER TABLE CompanySettings
  ADD COLUMN stockIntakeOilGrouping INTEGER NOT NULL DEFAULT 0
  CHECK (stockIntakeOilGrouping IN (0, 1));

ALTER TABLE Product ADD COLUMN stockIntakeGroup TEXT
  CHECK (stockIntakeGroup IS NULL OR stockIntakeGroup IN ('PALM_OIL', 'SLUDGE_OIL'));

ALTER TABLE Product ADD COLUMN stockPoolProductId INTEGER
  REFERENCES Product(productId);

ALTER TABLE Product ADD COLUMN excludeFromSales INTEGER NOT NULL DEFAULT 0
  CHECK (excludeFromSales IN (0, 1));
