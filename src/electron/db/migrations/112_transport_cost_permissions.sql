-- Grant transport cost routes to roles with similar existing access.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'transport-rates', access
FROM RoleRoutePermission
WHERE routeId = 'unit-prices';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'transport-cost-compute', access
FROM RoleRoutePermission
WHERE routeId = 'sales';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'transport-cost-report', access
FROM RoleRoutePermission
WHERE routeId = 'monthly-payment-delivery-report';
