-- Grant bin card to roles that can open stock movements.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'stock-bin-card', access
FROM RoleRoutePermission
WHERE routeId = 'stock-movements';

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'stock-bin-card', access
FROM RoleRoutePermission
WHERE routeId = 'stock-balance';
