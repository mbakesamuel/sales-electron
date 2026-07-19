-- Grant report-settings route to roles that can access company settings.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'report-settings', access
FROM RoleRoutePermission
WHERE routeId = 'company-settings';
