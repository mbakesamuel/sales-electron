-- Rename Sales clerk system role to Store Keeper (idempotent).
-- Does not overwrite existing STORE_KEEPER permission rows.

INSERT OR IGNORE INTO Role (id, label, isSystem, sortOrder, createdAt, updatedAt)
VALUES ('STORE_KEEPER', 'Store Keeper', 1, 50, datetime('now'), datetime('now'));

UPDATE Role
SET label = 'Store Keeper', isSystem = 1, sortOrder = 50, updatedAt = datetime('now')
WHERE id = 'STORE_KEEPER';

UPDATE User SET role = 'STORE_KEEPER' WHERE role = 'SALES_CLERK';

UPDATE RoleRoutePermission
SET role = 'STORE_KEEPER'
WHERE role = 'SALES_CLERK'
  AND routeId NOT IN (
    SELECT routeId FROM RoleRoutePermission WHERE role = 'STORE_KEEPER'
  );

DELETE FROM RoleRoutePermission WHERE role = 'SALES_CLERK';

UPDATE RoleActionPermission
SET role = 'STORE_KEEPER'
WHERE role = 'SALES_CLERK'
  AND actionKey NOT IN (
    SELECT actionKey FROM RoleActionPermission WHERE role = 'STORE_KEEPER'
  );

DELETE FROM RoleActionPermission WHERE role = 'SALES_CLERK';

DELETE FROM Role WHERE id = 'SALES_CLERK';
