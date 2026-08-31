-- Sales invoices: lock add/edit line unit price to the pricing schedule when on (default on).

ALTER TABLE CompanySettings
  ADD COLUMN salesInvoiceLockUnitPrice INTEGER NOT NULL DEFAULT 1
  CHECK (salesInvoiceLockUnitPrice IN (0, 1));
