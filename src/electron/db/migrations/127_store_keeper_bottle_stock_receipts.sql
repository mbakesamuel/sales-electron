-- Store Keepers capture bottle palm oil reception at Bota (Bottle Stock → Stock Reception).
-- Safe to re-run.

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
VALUES
  ('STORE_KEEPER', 'draft_stock_receipts', 1),
  ('STORE_KEEPER', 'post_stock_receipts', 1),
  ('STORE_KEEPER', 'direct_post_stock_receipts', 0);

UPDATE RoleActionPermission
SET allowed = 1
WHERE role = 'STORE_KEEPER'
  AND actionKey IN ('draft_stock_receipts', 'post_stock_receipts');

UPDATE RoleActionPermission
SET allowed = 0
WHERE role = 'STORE_KEEPER'
  AND actionKey = 'direct_post_stock_receipts';
