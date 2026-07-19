-- Grant carry-forward stock route to roles that can write stock adjustments.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'carry-forward-stock', access
FROM RoleRoutePermission
WHERE routeId = 'stock-adjustments';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'carry-forward-stock', access
FROM RoleRoutePermission
WHERE routeId = 'stock';
