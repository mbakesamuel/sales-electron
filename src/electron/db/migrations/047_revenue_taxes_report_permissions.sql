-- Grant revenue & taxes report to roles that can open monthly palm oil sales.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'revenue-taxes-report', access
FROM RoleRoutePermission
WHERE routeId = 'monthly-palm-oil-sales-report';
