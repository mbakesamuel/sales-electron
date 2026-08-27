-- Statistics clerk: primary transfer operator (bulk + bottled write).
-- Store keeper: receive-only for incoming inter-site transfers.
-- Safe to re-run; INSERT OR IGNORE + targeted UPDATEs.

INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('STATISTICS_CLERK', 'stock', 'WRITE'),
  ('STATISTICS_CLERK', 'bottled-stock', 'WRITE');

UPDATE RoleRoutePermission
SET access = 'WRITE'
WHERE routeId IN ('stock', 'bottled-stock')
  AND role = 'STATISTICS_CLERK';

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
SELECT id, 'receive_stock_transfers', 0
FROM Role;

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
VALUES
  ('STATISTICS_CLERK', 'draft_stock_transfers', 1),
  ('STATISTICS_CLERK', 'post_stock_transfers', 1),
  ('STATISTICS_CLERK', 'receive_stock_transfers', 1),
  ('STORE_KEEPER', 'receive_stock_transfers', 1),
  ('ADMIN', 'receive_stock_transfers', 1),
  ('MANAGER', 'receive_stock_transfers', 1),
  ('SENIOR_SALES_SUPERVISOR', 'receive_stock_transfers', 1);

UPDATE RoleActionPermission
SET allowed = 1
WHERE actionKey = 'receive_stock_transfers'
  AND role IN (
    'ADMIN',
    'MANAGER',
    'SENIOR_SALES_SUPERVISOR',
    'STATISTICS_CLERK',
    'STORE_KEEPER'
  );

UPDATE RoleActionPermission
SET allowed = 1
WHERE actionKey IN ('draft_stock_transfers', 'post_stock_transfers')
  AND role = 'STATISTICS_CLERK';

UPDATE RoleActionPermission
SET allowed = 0
WHERE actionKey IN ('draft_stock_transfers', 'post_stock_transfers')
  AND role = 'STORE_KEEPER';
