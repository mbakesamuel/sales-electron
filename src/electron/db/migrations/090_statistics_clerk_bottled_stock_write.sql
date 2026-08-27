-- Statistics clerk needs bottled-stock WRITE for unified Stock (loose + bottled).
-- Migration 088 may have been applied before route rows were corrected; safe to re-run.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES ('STATISTICS_CLERK', 'bottled-stock', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE role = 'STATISTICS_CLERK'
  AND routeId = 'bottled-stock';
