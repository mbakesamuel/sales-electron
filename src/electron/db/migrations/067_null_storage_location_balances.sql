-- PKCP/PKP products: stock balances and movements without a storage location.
PRAGMA foreign_keys = OFF;

-- StockAdjustmentLine: nullable storageLocationId
CREATE TABLE StockAdjustmentLine__null_loc (
  id TEXT PRIMARY KEY NOT NULL,
  adjustmentId TEXT NOT NULL REFERENCES StockAdjustment(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  deltaQty TEXT NOT NULL,
  storageLocationId INTEGER REFERENCES StorageLocation(id),
  fromCondition TEXT CHECK (fromCondition IS NULL OR fromCondition IN ('SELLABLE','UNSELLABLE')),
  toCondition TEXT CHECK (toCondition IS NULL OR toCondition IN ('SELLABLE','UNSELLABLE'))
);
INSERT INTO StockAdjustmentLine__null_loc (
  id, adjustmentId, productId, deltaQty, storageLocationId, fromCondition, toCondition
)
SELECT id, adjustmentId, productId, deltaQty, storageLocationId, fromCondition, toCondition
FROM StockAdjustmentLine;
DROP TABLE StockAdjustmentLine;
ALTER TABLE StockAdjustmentLine__null_loc RENAME TO StockAdjustmentLine;
CREATE INDEX IF NOT EXISTS StockAdjustmentLine_adjustment_idx ON StockAdjustmentLine (adjustmentId);
CREATE INDEX IF NOT EXISTS StockAdjustmentLine_product_idx ON StockAdjustmentLine (productId);
CREATE INDEX IF NOT EXISTS StockAdjustmentLine_location_idx ON StockAdjustmentLine (storageLocationId);

-- StockMovement: nullable storageLocationId
CREATE TABLE StockMovement__null_loc (
  id TEXT PRIMARY KEY NOT NULL,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  productId INTEGER NOT NULL REFERENCES Product(productId),
  kind TEXT NOT NULL CHECK (kind IN ('RECEIPT','TRANSFER_OUT','TRANSFER_IN','SALE','SALE_REVERSAL','ADJUSTMENT')),
  qty TEXT NOT NULL,
  occurredAt TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES User(id),
  sourceKind TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  storageLocationId INTEGER REFERENCES StorageLocation(id),
  condition TEXT NOT NULL DEFAULT 'SELLABLE' CHECK (condition IN ('SELLABLE','UNSELLABLE'))
);
INSERT INTO StockMovement__null_loc (
  id, salesPointId, productId, kind, qty, occurredAt, userId,
  sourceKind, sourceId, notes, createdAt, storageLocationId, condition
)
SELECT id, salesPointId, productId, kind, qty, occurredAt, userId,
       sourceKind, sourceId, notes, createdAt, storageLocationId, condition
FROM StockMovement;
DROP TABLE StockMovement;
ALTER TABLE StockMovement__null_loc RENAME TO StockMovement;
CREATE INDEX IF NOT EXISTS StockMovement_point_product_date_idx ON StockMovement (salesPointId, productId, occurredAt);
CREATE INDEX IF NOT EXISTS StockMovement_location_product_idx ON StockMovement (storageLocationId, productId);
CREATE INDEX IF NOT EXISTS StockMovement_source_idx ON StockMovement (sourceKind, sourceId);
CREATE INDEX IF NOT EXISTS StockMovement_occurred_idx ON StockMovement (occurredAt);
CREATE INDEX IF NOT EXISTS StockMovement_user_date_idx ON StockMovement (userId, occurredAt);

-- StockBalance: nullable storageLocationId + partial unique indexes
CREATE TABLE StockBalance__null_loc (
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId) ON DELETE CASCADE,
  qty TEXT NOT NULL,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  storageLocationId INTEGER REFERENCES StorageLocation(id),
  condition TEXT NOT NULL DEFAULT 'SELLABLE' CHECK (condition IN ('SELLABLE','UNSELLABLE'))
);
INSERT INTO StockBalance__null_loc (
  salesPointId, productId, qty, updatedAt, storageLocationId, condition
)
SELECT salesPointId, productId, qty, updatedAt, storageLocationId, condition
FROM StockBalance;
DROP TABLE StockBalance;
ALTER TABLE StockBalance__null_loc RENAME TO StockBalance;
CREATE INDEX IF NOT EXISTS StockBalance_product_idx ON StockBalance (productId);
CREATE INDEX IF NOT EXISTS StockBalance_location_idx ON StockBalance (storageLocationId);
CREATE UNIQUE INDEX IF NOT EXISTS StockBalance_loc_key
  ON StockBalance (salesPointId, productId, storageLocationId, condition)
  WHERE storageLocationId IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS StockBalance_no_loc_key
  ON StockBalance (salesPointId, productId, condition)
  WHERE storageLocationId IS NULL;

PRAGMA foreign_keys = ON;
