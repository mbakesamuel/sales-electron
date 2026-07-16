-- Storage locations: sales point + physical location.
-- Requires: 00_prerequisites.sql, 02_location.sql

INSERT INTO StorageLocation (salesPointId, locationId, isDefault, isSellable)
SELECT
  1,
  (SELECT id FROM Location WHERE locationName = 'Main Store' LIMIT 1),
  1,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM StorageLocation sl
  INNER JOIN Location l ON l.id = sl.locationId
  WHERE sl.salesPointId = 1 AND l.locationName = 'Main Store'
);

INSERT INTO StorageLocation (salesPointId, locationId, isDefault, isSellable)
SELECT
  1,
  (SELECT id FROM Location WHERE locationName = 'Quarantine' LIMIT 1),
  0,
  0
WHERE NOT EXISTS (
  SELECT 1
  FROM StorageLocation sl
  INNER JOIN Location l ON l.id = sl.locationId
  WHERE sl.salesPointId = 1 AND l.locationName = 'Quarantine'
);

INSERT INTO StorageLocation (salesPointId, locationId, isDefault, isSellable)
SELECT
  2,
  (SELECT id FROM Location WHERE locationName = 'Bottle Oil Store' LIMIT 1),
  1,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM StorageLocation sl
  INNER JOIN Location l ON l.id = sl.locationId
  WHERE sl.salesPointId = 2 AND l.locationName = 'Bottle Oil Store'
);
