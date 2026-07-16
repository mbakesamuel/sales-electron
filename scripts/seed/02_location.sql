-- Physical storage locations (master list).
-- Linked to sales points via StorageLocation.

INSERT INTO Location (locationName)
SELECT 'Main Store'
WHERE NOT EXISTS (SELECT 1 FROM Location WHERE locationName = 'Main Store');

INSERT INTO Location (locationName)
SELECT 'Bottle Oil Store'
WHERE NOT EXISTS (SELECT 1 FROM Location WHERE locationName = 'Bottle Oil Store');

INSERT INTO Location (locationName)
SELECT 'Quarantine'
WHERE NOT EXISTS (SELECT 1 FROM Location WHERE locationName = 'Quarantine');
