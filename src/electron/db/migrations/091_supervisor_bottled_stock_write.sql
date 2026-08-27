-- Supervisors need stock + bottled-stock WRITE for unified Stock (loose + bottled),
-- same gate as Statistics clerk (migration 090). Safe to re-run.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('MANAGER', 'stock', 'WRITE'),
  ('MANAGER', 'bottled-stock', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'stock', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'bottled-stock', 'WRITE'),
  ('JNR_SALES_SUP', 'stock', 'WRITE'),
  ('JNR_SALES_SUP', 'bottled-stock', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId IN ('stock', 'bottled-stock')
  AND role IN ('MANAGER', 'SENIOR_SALES_SUPERVISOR', 'JNR_SALES_SUP');
