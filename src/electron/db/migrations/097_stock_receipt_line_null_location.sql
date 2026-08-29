-- Palm Kernel / Cake receipts post at collection-point level (no storage location).

PRAGMA foreign_keys = OFF;

CREATE TABLE StockReceiptLine__null_loc (
  id TEXT PRIMARY KEY NOT NULL,
  receiptId TEXT NOT NULL REFERENCES StockReceipt(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  qty TEXT NOT NULL,
  storageLocationId INTEGER REFERENCES StorageLocation(id)
);
INSERT INTO StockReceiptLine__null_loc (id, receiptId, productId, qty, storageLocationId)
SELECT id, receiptId, productId, qty, storageLocationId
FROM StockReceiptLine;
DROP TABLE StockReceiptLine;
ALTER TABLE StockReceiptLine__null_loc RENAME TO StockReceiptLine;
CREATE INDEX IF NOT EXISTS StockReceiptLine_receipt_idx ON StockReceiptLine (receiptId);
CREATE INDEX IF NOT EXISTS StockReceiptLine_product_idx ON StockReceiptLine (productId);
CREATE INDEX IF NOT EXISTS StockReceiptLine_location_idx ON StockReceiptLine (storageLocationId);

PRAGMA foreign_keys = ON;
