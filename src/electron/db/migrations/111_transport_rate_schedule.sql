CREATE TABLE IF NOT EXISTS TransportRateSchedule (
  id TEXT PRIMARY KEY NOT NULL,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  productId INTEGER NOT NULL REFERENCES Product(productId),
  ratePerKg TEXT NOT NULL,
  effectiveFrom TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (salesPointId, productId, effectiveFrom)
);

CREATE INDEX IF NOT EXISTS TransportRateSchedule_point_product_from_idx
  ON TransportRateSchedule (salesPointId, productId, effectiveFrom);
