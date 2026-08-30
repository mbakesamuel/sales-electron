-- Grant daily sales matrix report to roles that can open the daily sales report.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'daily-sales-matrix-report', access
FROM RoleRoutePermission
WHERE routeId = 'daily-sales-report';
