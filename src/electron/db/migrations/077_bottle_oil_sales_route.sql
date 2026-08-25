-- Seed Bottle Oil sales route for Store Keeper and sales operators.
-- Safe to re-run.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('ADMIN', 'bottle-oil-sales', 'WRITE'),
  ('MANAGER', 'bottle-oil-sales', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'bottle-oil-sales', 'WRITE'),
  ('STORE_KEEPER', 'bottle-oil-sales', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId = 'bottle-oil-sales'
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR', 'STORE_KEEPER');
