-- Per customer type: exempt from sales tax on invoices and delivery orders.
ALTER TABLE CustomerTypeDefinition
  ADD COLUMN exemptFromSalesTax INTEGER NOT NULL DEFAULT 0
  CHECK (exemptFromSalesTax IN (0, 1));

UPDATE CustomerTypeDefinition
SET exemptFromSalesTax = 1
WHERE code = 'INDUSTRY';
