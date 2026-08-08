-- Grant monthly stock reconciliation to roles that can open the stock report.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'monthly-stock-reconciliation-report', access
FROM RoleRoutePermission
WHERE routeId = 'stock-report';
