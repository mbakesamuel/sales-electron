-- Direct-post stock document actions (create and finalize in one step).
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed) VALUES
  ('ADMIN', 'direct_post_stock_receipts', 1),
  ('ADMIN', 'direct_post_stock_transfers', 1),
  ('MANAGER', 'direct_post_stock_receipts', 1),
  ('MANAGER', 'direct_post_stock_transfers', 1),
  ('SENIOR_SALES_SUPERVISOR', 'direct_post_stock_receipts', 0),
  ('SENIOR_SALES_SUPERVISOR', 'direct_post_stock_transfers', 0),
  ('STATISTICS_CLERK', 'direct_post_stock_receipts', 0),
  ('STATISTICS_CLERK', 'direct_post_stock_transfers', 0),
  ('STORE_KEEPER', 'direct_post_stock_receipts', 0),
  ('STORE_KEEPER', 'direct_post_stock_transfers', 0);
