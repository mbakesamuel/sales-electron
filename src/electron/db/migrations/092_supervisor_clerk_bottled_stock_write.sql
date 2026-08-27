-- Re-grant bottled-stock WRITE for unified Stock mutations (loose + bottled docs).
-- 090/091 were marked applied but live RoleRoutePermission rows stayed NONE
-- (likely overwritten by a later permission-matrix save). Safe to re-run.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('STATISTICS_CLERK', 'stock', 'WRITE'),
  ('STATISTICS_CLERK', 'bottled-stock', 'WRITE'),
  ('MANAGER', 'stock', 'WRITE'),
  ('MANAGER', 'bottled-stock', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'stock', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'bottled-stock', 'WRITE'),
  ('JNR_SALES_SUP', 'stock', 'WRITE'),
  ('JNR_SALES_SUP', 'bottled-stock', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId IN ('stock', 'bottled-stock')
  AND role IN (
    'STATISTICS_CLERK',
    'MANAGER',
    'SENIOR_SALES_SUPERVISOR',
    'JNR_SALES_SUP'
  );
