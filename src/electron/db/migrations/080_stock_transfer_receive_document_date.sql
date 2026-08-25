-- When on, transfer receive posts inventory using the user-entered receive Date
-- (open financial month). When off (default), stock posts at Receive confirm time.

ALTER TABLE CompanySettings
  ADD COLUMN stockTransferReceiveUsesDocumentDate INTEGER NOT NULL DEFAULT 0
  CHECK (stockTransferReceiveUsesDocumentDate IN (0, 1));
