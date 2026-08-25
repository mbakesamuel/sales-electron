-- Seed sales validation route for roles that validate sales.
-- Safe to re-run.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('ADMIN', 'sales-validation', 'WRITE'),
  ('MANAGER', 'sales-validation', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'sales-validation', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId = 'sales-validation'
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR');
