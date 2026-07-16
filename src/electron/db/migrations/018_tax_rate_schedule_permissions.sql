-- Ensure Tax rates route permissions exist for roles that already have tax-regimes access.
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
SELECT role, 'tax-rate-schedules', access
FROM RoleRoutePermission
WHERE routeId = 'tax-regimes';
