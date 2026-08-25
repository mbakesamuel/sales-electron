-- Seed validate_vehicle_consignment_notes action + ensure VCN route for supervisors.
-- Safe to re-run; INSERT OR IGNORE + targeted UPDATEs.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('ADMIN', 'vehicle-consignment-notes', 'WRITE'),
  ('MANAGER', 'vehicle-consignment-notes', 'WRITE'),
  ('SENIOR_SALES_SUPERVISOR', 'vehicle-consignment-notes', 'WRITE'),
  ('STATISTICS_CLERK', 'vehicle-consignment-notes', 'READ');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId = 'vehicle-consignment-notes'
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR');

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
VALUES
  ('ADMIN', 'validate_vehicle_consignment_notes', 1),
  ('MANAGER', 'validate_vehicle_consignment_notes', 1),
  ('SENIOR_SALES_SUPERVISOR', 'validate_vehicle_consignment_notes', 1),
  ('STATISTICS_CLERK', 'validate_vehicle_consignment_notes', 0),
  ('STORE_KEEPER', 'validate_vehicle_consignment_notes', 0);

UPDATE RoleActionPermission
SET allowed = 1
WHERE actionKey = 'validate_vehicle_consignment_notes'
  AND role IN ('ADMIN', 'MANAGER', 'SENIOR_SALES_SUPERVISOR');
