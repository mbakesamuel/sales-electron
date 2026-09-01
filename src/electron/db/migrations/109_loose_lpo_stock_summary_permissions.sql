-- Grant loose LPO stock summary to roles that can open monthly stock reconciliation.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'loose-lpo-stock-summary-report', access
FROM RoleRoutePermission
WHERE routeId = 'monthly-stock-reconciliation-report';
