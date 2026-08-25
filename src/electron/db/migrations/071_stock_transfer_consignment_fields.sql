-- Consignment signatory fields on stock transfers (bottle oil consignment notes).
ALTER TABLE StockTransfer ADD COLUMN consignedBy TEXT;
ALTER TABLE StockTransfer ADD COLUMN consDesign TEXT;
ALTER TABLE StockTransfer ADD COLUMN consDate TEXT;
ALTER TABLE StockTransfer ADD COLUMN receiveBy TEXT;
ALTER TABLE StockTransfer ADD COLUMN receiveByDesign TEXT;
ALTER TABLE StockTransfer ADD COLUMN receiveDate TEXT;
