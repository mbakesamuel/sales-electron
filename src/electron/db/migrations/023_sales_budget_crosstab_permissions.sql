-- Grant sales budget crosstab routes to roles that already have sales-budgets access.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'sales-budget-monthly-crosstab', access
FROM RoleRoutePermission
WHERE routeId = 'sales-budgets';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'sales-budget-weekly-crosstab', access
FROM RoleRoutePermission
WHERE routeId = 'sales-budgets';
