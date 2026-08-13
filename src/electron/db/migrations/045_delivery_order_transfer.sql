-- DO balance transfer: TRANSFER sourceKind, link column, audit tables, permissions.
-- Safe to re-run only once (tracked by schema_migrations).

PRAGMA foreign_keys = OFF;

CREATE TABLE DeliveryOrder__transfer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deliveryOrderNo TEXT NOT NULL UNIQUE,
  dateIssued TEXT NOT NULL,
  customerId INTEGER NOT NULL REFERENCES Customer(id),
  orderRef TEXT,
  salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  financialYear INTEGER,
  financialMonth INTEGER,
  createdByUserId TEXT REFERENCES User(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VALIDATED','REJECTED')),
  validatedAt TEXT,
  validatedByUserId TEXT REFERENCES User(id),
  postingCalendarYear INTEGER,
  commercialServiceId TEXT REFERENCES CommercialService(id),
  issuerPhoneSnapshot TEXT,
  issuerAddressSnapshot TEXT,
  commercialServiceNameSnapshot TEXT,
  reviewedAt TEXT,
  reviewedByUserId TEXT REFERENCES User(id),
  cancelledAt TEXT,
  cancelledByUserId TEXT REFERENCES User(id),
  cancelReason TEXT,
  sourceKind TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (sourceKind IN ('NORMAL','CARRY_FORWARD','TRANSFER')),
  transferredFromDeliveryOrderId INTEGER REFERENCES DeliveryOrder(id)
);

INSERT INTO DeliveryOrder__transfer (
  id, deliveryOrderNo, dateIssued, customerId, orderRef, salesPointId,
  financialYear, financialMonth, createdByUserId, status, validatedAt, validatedByUserId,
  postingCalendarYear, commercialServiceId, issuerPhoneSnapshot, issuerAddressSnapshot,
  commercialServiceNameSnapshot, reviewedAt, reviewedByUserId, cancelledAt, cancelledByUserId,
  cancelReason, sourceKind, transferredFromDeliveryOrderId
)
SELECT
  d.id,
  d.deliveryOrderNo,
  d.dateIssued,
  d.customerId,
  d.orderRef,
  d.salesPointId,
  d.financialYear,
  d.financialMonth,
  d.createdByUserId,
  d.status,
  d.validatedAt,
  d.validatedByUserId,
  d.postingCalendarYear,
  d.commercialServiceId,
  d.issuerPhoneSnapshot,
  d.issuerAddressSnapshot,
  d.commercialServiceNameSnapshot,
  d.reviewedAt,
  d.reviewedByUserId,
  d.cancelledAt,
  d.cancelledByUserId,
  d.cancelReason,
  COALESCE(d.sourceKind, 'NORMAL'),
  NULL
FROM DeliveryOrder d;

DROP TABLE DeliveryOrder;
ALTER TABLE DeliveryOrder__transfer RENAME TO DeliveryOrder;

-- Re-apply self-FK now that the table has its final name (SQLite keeps the
-- REFERENCES DeliveryOrder(id) name from CREATE; recreate indexes).
CREATE INDEX IF NOT EXISTS DeliveryOrder_customer_idx ON DeliveryOrder (customerId);
CREATE INDEX IF NOT EXISTS DeliveryOrder_salesPoint_idx ON DeliveryOrder (salesPointId);
CREATE INDEX IF NOT EXISTS DeliveryOrder_fy_posting_idx
  ON DeliveryOrder (financialYear, postingCalendarYear, financialMonth);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_date_idx ON DeliveryOrder (status, dateIssued);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_reviewed_idx ON DeliveryOrder (status, reviewedAt);
CREATE INDEX IF NOT EXISTS DeliveryOrder_status_cancelled_idx ON DeliveryOrder (status, cancelledAt);
CREATE INDEX IF NOT EXISTS DeliveryOrder_commercialService_idx ON DeliveryOrder (commercialServiceId);
CREATE INDEX IF NOT EXISTS DeliveryOrder_transferredFrom_idx
  ON DeliveryOrder (transferredFromDeliveryOrderId);

CREATE TABLE IF NOT EXISTS DeliveryOrderTransfer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromDeliveryOrderId INTEGER NOT NULL REFERENCES DeliveryOrder(id),
  toDeliveryOrderId INTEGER NOT NULL UNIQUE REFERENCES DeliveryOrder(id),
  fromSalesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  toSalesPointId INTEGER NOT NULL REFERENCES SalesPoint(id),
  transferredAt TEXT NOT NULL,
  transferredByUserId TEXT NOT NULL REFERENCES User(id),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS DeliveryOrderTransfer_from_idx
  ON DeliveryOrderTransfer (fromDeliveryOrderId);
CREATE INDEX IF NOT EXISTS DeliveryOrderTransfer_to_idx
  ON DeliveryOrderTransfer (toDeliveryOrderId);

CREATE TABLE IF NOT EXISTS DeliveryOrderTransferLine (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transferId INTEGER NOT NULL REFERENCES DeliveryOrderTransfer(id) ON DELETE CASCADE,
  productId INTEGER NOT NULL REFERENCES Product(productId),
  qtyKg INTEGER NOT NULL CHECK (qtyKg > 0)
);
CREATE INDEX IF NOT EXISTS DeliveryOrderTransferLine_transfer_idx
  ON DeliveryOrderTransferLine (transferId);

PRAGMA foreign_keys = ON;

-- Route: same access as delivery-orders for roles that already have it.
INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'delivery-order-transfer', access
FROM RoleRoutePermission
WHERE routeId = 'delivery-orders';

-- Action: supervisors and above (not clerks / stats).
INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed) VALUES
  ('ADMIN', 'transfer_delivery_order_balance', 1),
  ('MANAGER', 'transfer_delivery_order_balance', 1),
  ('SENIOR_SALES_SUPERVISOR', 'transfer_delivery_order_balance', 1),
  ('STATISTICS_SUPERVISOR', 'transfer_delivery_order_balance', 0),
  ('SALES_CLERK', 'transfer_delivery_order_balance', 0);
