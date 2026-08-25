-- Explicit Stock module route (bulk / non-bottled Stock screen).
-- Custom roles stay NONE so Store Keeper can be limited to bottled-stock only.
-- System roles that already had stock-* access are promoted to match.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT DISTINCT role, 'stock', 'NONE'
FROM RoleRoutePermission;

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT id, 'stock', 'NONE'
FROM Role
WHERE id NOT IN (SELECT role FROM RoleRoutePermission WHERE routeId = 'stock');

-- WRITE if the role could write any stock document / balance route.
UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId = 'stock'
  AND role IN (
    SELECT role
    FROM RoleRoutePermission
    WHERE routeId IN (
      'stock-balance',
      'stock-movements',
      'stock-receipts',
      'stock-receipt-lines',
      'stock-transfers',
      'stock-transfer-lines',
      'stock-adjustments',
      'stock-adjustment-lines'
    )
      AND access = 'WRITE'
  )
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR', 'STATISTICS_SUPERVISOR', 'SALES_CLERK');

-- READ if still NONE but role had read on any stock-* route (system roles only).
UPDATE RoleRoutePermission
SET access = 'READ'
WHERE routeId = 'stock'
  AND access = 'NONE'
  AND role IN (
    SELECT role
    FROM RoleRoutePermission
    WHERE routeId IN (
      'stock-balance',
      'stock-movements',
      'stock-receipts',
      'stock-receipt-lines',
      'stock-transfers',
      'stock-transfer-lines',
      'stock-adjustments',
      'stock-adjustment-lines'
    )
      AND access IN ('READ', 'WRITE')
  )
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR', 'STATISTICS_SUPERVISOR', 'SALES_CLERK');

-- Bottled Stock: ensure row exists for every role (NONE unless already set).
INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT DISTINCT role, 'bottled-stock', 'NONE'
FROM RoleRoutePermission;

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT id, 'bottled-stock', 'NONE'
FROM Role
WHERE id NOT IN (SELECT role FROM RoleRoutePermission WHERE routeId = 'bottled-stock');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId = 'bottled-stock'
  AND role IN ('ADMIN', 'MANAGER')
  AND access = 'NONE';
