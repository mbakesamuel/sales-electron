-- Grant report routes to roles that already have stock-balance access.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'stock-commitment-report', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'stock-report', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'commitment-report', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'bottle-oil-stock-sales-report', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'bottled-weekly-issues-report', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'sales-delivery-report', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'monthly-delivery-report-h1', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'monthly-delivery-report-h2', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';
