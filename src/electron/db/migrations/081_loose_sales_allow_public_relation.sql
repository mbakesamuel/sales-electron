-- Loose (Sales Invoicing) Public relation disposition: allowed when on (default off).

ALTER TABLE CompanySettings
  ADD COLUMN looseSalesAllowPublicRelation INTEGER NOT NULL DEFAULT 0
  CHECK (looseSalesAllowPublicRelation IN (0, 1));
