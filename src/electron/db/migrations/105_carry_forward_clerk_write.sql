-- Statistics clerk: write access to carry-forward input screens (validation remains supervisor-only).

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('STATISTICS_CLERK', 'carry-forward-stock', 'WRITE'),
  ('STATISTICS_CLERK', 'carry-forward-commitments', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE role = 'STATISTICS_CLERK'
  AND routeId IN ('carry-forward-stock', 'carry-forward-commitments');
