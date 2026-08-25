-- Rename Statistics supervisor system role to Statistics clerk (idempotent).
-- Does not overwrite existing STATISTICS_CLERK permission rows.

INSERT OR IGNORE INTO Role (id, label, isSystem, sortOrder, createdAt, updatedAt)
VALUES ('STATISTICS_CLERK', 'Statistics clerk', 1, 40, datetime('now'), datetime('now'));

UPDATE Role
SET label = 'Statistics clerk', isSystem = 1, sortOrder = 40, updatedAt = datetime('now')
WHERE id = 'STATISTICS_CLERK';

UPDATE User SET role = 'STATISTICS_CLERK' WHERE role = 'STATISTICS_SUPERVISOR';

UPDATE RoleRoutePermission
SET role = 'STATISTICS_CLERK'
WHERE role = 'STATISTICS_SUPERVISOR'
  AND routeId NOT IN (
    SELECT routeId FROM RoleRoutePermission WHERE role = 'STATISTICS_CLERK'
  );

DELETE FROM RoleRoutePermission WHERE role = 'STATISTICS_SUPERVISOR';

UPDATE RoleActionPermission
SET role = 'STATISTICS_CLERK'
WHERE role = 'STATISTICS_SUPERVISOR'
  AND actionKey NOT IN (
    SELECT actionKey FROM RoleActionPermission WHERE role = 'STATISTICS_CLERK'
  );

DELETE FROM RoleActionPermission WHERE role = 'STATISTICS_SUPERVISOR';

DELETE FROM Role WHERE id = 'STATISTICS_SUPERVISOR';
