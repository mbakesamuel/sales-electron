-- Bottle Oil sales: whether invoices use registered customers (default off = invoice name only).

ALTER TABLE CompanySettings ADD COLUMN bottleOilUseRegisteredCustomers INTEGER NOT NULL DEFAULT 0 CHECK (bottleOilUseRegisteredCustomers IN (0, 1));
