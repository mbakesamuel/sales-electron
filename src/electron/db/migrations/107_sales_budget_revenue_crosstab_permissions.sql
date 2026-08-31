-- Grant sales budget revenue crosstab routes to roles that already have kg crosstab access.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'sales-budget-monthly-revenue-crosstab', access
FROM RoleRoutePermission
WHERE routeId = 'sales-budget-monthly-crosstab';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'sales-budget-weekly-revenue-crosstab', access
FROM RoleRoutePermission
WHERE routeId = 'sales-budget-weekly-crosstab';
