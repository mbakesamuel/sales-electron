-- Grant monthly bottled oil report to roles that can open bottled palm oil sales return.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'monthly-bottled-oil-report', access
FROM RoleRoutePermission
WHERE routeId = 'bottled-palm-oil-sales-return-report';
