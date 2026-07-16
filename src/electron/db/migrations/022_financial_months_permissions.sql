-- Grant financial-months access matching financial-year-periods.
INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'financial-months', access
FROM RoleRoutePermission
WHERE routeId = 'financial-year-periods';
