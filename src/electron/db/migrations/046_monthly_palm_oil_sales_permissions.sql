-- Grant monthly palm oil sales report to roles that can open deliveries-by-destination.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'monthly-palm-oil-sales-report', access
FROM RoleRoutePermission
WHERE routeId = 'monthly-deliveries-by-destination-report';
