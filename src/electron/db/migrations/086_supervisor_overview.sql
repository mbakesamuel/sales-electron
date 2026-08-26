-- Supervisor overview: consignment validation queue route for validators.
-- Safe to re-run; INSERT OR IGNORE + targeted UPDATEs.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('ADMIN', 'vehicle-consignment-validation', 'WRITE'),
  ('MANAGER', 'vehicle-consignment-validation', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'vehicle-consignment-validation', 'WRITE'),
  ('JNR_SALES_SUP', 'vehicle-consignment-validation', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId = 'vehicle-consignment-validation'
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR', 'JNR_SALES_SUP');
