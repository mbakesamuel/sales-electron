-- Grant DO tracking route to roles that can access delivery orders.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'delivery-order-tracking', access
FROM RoleRoutePermission
WHERE routeId = 'delivery-orders';
