-- Receive incoming transfers only on Bottled Stock (Store Keeper / Admin).
-- Supervisors and Statistics clerk initiate/dispatch from main Stock; they do not receive.
-- Safe to re-run.

UPDATE RoleActionPermission
SET allowed = 0
WHERE actionKey = 'receive_stock_transfers'
  AND role IN (
    'MANAGER',
    'SENIOR_SALES_SUPERVISOR',
    'JNR_SALES_SUP',
    'STATISTICS_CLERK'
  );

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
VALUES
  ('STORE_KEEPER', 'receive_stock_transfers', 1),
  ('ADMIN', 'receive_stock_transfers', 1);

UPDATE RoleActionPermission
SET allowed = 1
WHERE actionKey = 'receive_stock_transfers'
  AND role IN ('STORE_KEEPER', 'ADMIN');
