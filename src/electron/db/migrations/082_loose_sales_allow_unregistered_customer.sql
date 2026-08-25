-- Loose Sales Invoicing: allow invoice-name-only (unregistered) customers when on (default off = directory required).

ALTER TABLE CompanySettings
  ADD COLUMN looseSalesAllowUnregisteredCustomer INTEGER NOT NULL DEFAULT 0
  CHECK (looseSalesAllowUnregisteredCustomer IN (0, 1));
