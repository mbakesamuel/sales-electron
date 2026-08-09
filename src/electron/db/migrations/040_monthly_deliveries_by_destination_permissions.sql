-- Grant deliveries-by-destination report to roles that can open monthly payment/delivery.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'monthly-deliveries-by-destination-report', access
FROM RoleRoutePermission
WHERE routeId = 'monthly-payment-delivery-report';
