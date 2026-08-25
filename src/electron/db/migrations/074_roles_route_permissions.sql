-- Seed roles route permissions (same access as role-permissions).
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'roles', access
FROM RoleRoutePermission
WHERE routeId = 'role-permissions';
