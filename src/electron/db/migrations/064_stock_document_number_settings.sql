-- Stock receipt/transfer number mode: 1 = auto-generate (default), 0 = manual entry on create.

ALTER TABLE CompanySettings ADD COLUMN autoGenerateStockReceiptNo INTEGER NOT NULL DEFAULT 1;
ALTER TABLE CompanySettings ADD COLUMN autoGenerateStockTransferNo INTEGER NOT NULL DEFAULT 1;
