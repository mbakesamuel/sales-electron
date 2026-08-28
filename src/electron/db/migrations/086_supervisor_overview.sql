-- Supervisor overview: consignment validation queue route for validators.
-- Safe to re-run; INSERT OR IGNORE + targeted UPDATEs.

-- Custom junior supervisor role (referenced by permission rows below).
INSERT OR IGNORE INTO Role (id, label, isSystem, sortOrder, createdAt, updatedAt)
VALUES ('JNR_SALES_SUP', 'Junior sales supervisor', 0, 35, datetime('now'), datetime('now'));

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
