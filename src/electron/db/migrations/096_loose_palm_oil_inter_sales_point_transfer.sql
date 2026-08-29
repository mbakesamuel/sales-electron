-- When on, loose Palm Oil (ProductCat.isMain, non-bottled) may transfer between collection points.
-- When off (default), inter transfers are bottled-products-only.

ALTER TABLE CompanySettings
  ADD COLUMN loosePalmOilAllowInterSalesPointTransfer INTEGER NOT NULL DEFAULT 0
  CHECK (loosePalmOilAllowInterSalesPointTransfer IN (0, 1));
