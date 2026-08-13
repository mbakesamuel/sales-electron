-- Grant industry product monthly sales report to roles that can open revenue & taxes.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'industry-product-monthly-sales-report', access
FROM RoleRoutePermission
WHERE routeId = 'revenue-taxes-report';
