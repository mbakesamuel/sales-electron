-- Receive transfers validation-style screen for Store Keeper (and Admin support).
-- Safe to re-run.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('STORE_KEEPER', 'receive-transfers', 'WRITE'),
  ('ADMIN', 'receive-transfers', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId = 'receive-transfers'
  AND role IN ('STORE_KEEPER', 'ADMIN');

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT id, 'receive-transfers', 'NONE'
FROM Role
WHERE id NOT IN (SELECT role FROM RoleRoutePermission WHERE routeId = 'receive-transfers');
