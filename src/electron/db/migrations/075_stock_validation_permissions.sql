-- Seed stock validation route + action for supervisor roles.
-- Also ensure supervisors can see bottled drafts in the shared queue.
-- Safe to re-run; INSERT OR IGNORE + targeted UPDATEs.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('ADMIN', 'stock-validation', 'WRITE'),
  ('MANAGER', 'stock-validation', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'stock-validation', 'WRITE'),
  ('ADMIN', 'bottled-stock', 'WRITE'),
  ('MANAGER', 'bottled-stock', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'bottled-stock', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId IN ('stock-validation', 'bottled-stock')
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR');

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
VALUES
  ('ADMIN', 'validate_stock_documents', 1),
  ('MANAGER', 'validate_stock_documents', 1),
  ('SENIOR_SALES_SUPERVISOR', 'validate_stock_documents', 1),
  ('STATISTICS_CLERK', 'validate_stock_documents', 0),
  ('STORE_KEEPER', 'validate_stock_documents', 0);

UPDATE RoleActionPermission
SET allowed = 1
WHERE actionKey = 'validate_stock_documents'
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR');
