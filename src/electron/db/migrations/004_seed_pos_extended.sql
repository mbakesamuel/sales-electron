-- Extended POS demo: BOTA sales point, bottled products, special customers, sample DO.

INSERT INTO SalesPoint (id, name)
SELECT 2, 'BOTA Outlet'
WHERE NOT EXISTS (SELECT 1 FROM SalesPoint WHERE id = 2);

INSERT INTO Location (locationName)
SELECT 'Bottle Oil Store'
WHERE NOT EXISTS (SELECT 1 FROM Location WHERE locationName = 'Bottle Oil Store');

INSERT INTO StorageLocation (salesPointId, locationId, isDefault)
SELECT
  2,
  (SELECT id FROM Location WHERE locationName = 'Bottle Oil Store' LIMIT 1),
  1
WHERE NOT EXISTS (
  SELECT 1 FROM StorageLocation sl
  INNER JOIN Location l ON l.id = sl.locationId
  WHERE sl.salesPointId = 2 AND l.locationName = 'Bottle Oil Store'
);
INSERT INTO ProductCat (productCatId, productCat, productCode, isBottled)
SELECT 2, 'Bottled Oil', 'BO', 1
WHERE NOT EXISTS (SELECT 1 FROM ProductCat WHERE productCatId = 2);

INSERT INTO Product (productId, productName, productCode, productCatId, commercialServiceId, uom)
SELECT 3, '1L Bottled Palm Oil', 'BO-1L', 2, 'seed-cs-001', 'Unit'
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE productId = 3);

INSERT INTO DeliveryOrder (
  deliveryOrderNo, dateIssued, customerId, salesPointId, status, validatedAt, commercialServiceId
)
SELECT
  'DO-2026-000001',
  '2026-07-01',
  (SELECT id FROM Customer WHERE name = 'Acme Trading Ltd' LIMIT 1),
  1,
  'VALIDATED',
  datetime('now'),
  'seed-cs-001'
WHERE NOT EXISTS (SELECT 1 FROM DeliveryOrder WHERE deliveryOrderNo = 'DO-2026-000001');

INSERT INTO DeliveryOrderDetails (deliveryOrderId, productId, orderQty, orderUnit, unitPrice)
SELECT d.id, 1, 5000, 'Kg', '500'
FROM DeliveryOrder d
WHERE d.deliveryOrderNo = 'DO-2026-000001'
  AND NOT EXISTS (
    SELECT 1 FROM DeliveryOrderDetails dd
    WHERE dd.deliveryOrderId = d.id AND dd.productId = 1
  );
