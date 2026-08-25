-- Bottle Oil sales: whether Ration disposition is allowed (default off).

ALTER TABLE CompanySettings ADD COLUMN bottleOilAllowRation INTEGER NOT NULL DEFAULT 0 CHECK (bottleOilAllowRation IN (0, 1));
