-- Grant other product sales and deliveries to roles that can open bottled palm oil sales return.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'other-product-sales-deliveries-report', access
FROM RoleRoutePermission
WHERE routeId = 'bottled-palm-oil-sales-return-report';
