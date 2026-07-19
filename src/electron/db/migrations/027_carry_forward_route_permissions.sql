-- Grant carry-forward commitments route to roles that can write delivery orders.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'carry-forward-commitments', access
FROM RoleRoutePermission
WHERE routeId = 'delivery-orders';
