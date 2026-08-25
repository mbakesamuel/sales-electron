-- When on (default), Loose Palm Oil (ProductCat.isMain) must sell from sales tanks.
-- Other loose products use any location with stock; PKCP/PKP omit storage.

ALTER TABLE CompanySettings
  ADD COLUMN loosePalmOilRequireSalesTank INTEGER NOT NULL DEFAULT 1
  CHECK (loosePalmOilRequireSalesTank IN (0, 1));
