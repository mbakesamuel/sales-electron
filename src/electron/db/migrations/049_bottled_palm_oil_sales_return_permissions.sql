-- Grant bottled palm oil sales return to roles that can open industry product monthly sales.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'bottled-palm-oil-sales-return-report', access
FROM RoleRoutePermission
WHERE routeId = 'industry-product-monthly-sales-report';
