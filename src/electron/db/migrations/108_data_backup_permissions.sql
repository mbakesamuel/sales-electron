-- Data backup route: ADMIN write only.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES ('ADMIN', 'data-backup', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE role = 'ADMIN' AND routeId = 'data-backup';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'data-backup', 'NONE'
FROM RoleRoutePermission
WHERE routeId = 'role-permissions' AND role != 'ADMIN';
