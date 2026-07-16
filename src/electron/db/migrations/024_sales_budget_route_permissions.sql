-- Grant sales-budget route to roles that already have sales-budgets access.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'sales-budget', access
FROM RoleRoutePermission
WHERE routeId = 'sales-budgets';

