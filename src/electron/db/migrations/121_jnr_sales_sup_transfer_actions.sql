-- Junior sales supervisor: seed stock transfer actions to match senior defaults.
-- Transfer initiate/receive are UI-managed via RoleActionPermission (no role-id allowlist).
-- Safe to re-run; INSERT OR IGNORE + targeted UPDATEs.

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
VALUES
  ('JNR_SALES_SUP', 'draft_stock_receipts', 1),
  ('JNR_SALES_SUP', 'post_stock_receipts', 1),
  ('JNR_SALES_SUP', 'draft_stock_transfers', 1),
  ('JNR_SALES_SUP', 'post_stock_transfers', 1),
  ('JNR_SALES_SUP', 'receive_stock_transfers', 0),
  ('JNR_SALES_SUP', 'draft_stock_adjustments', 1),
  ('JNR_SALES_SUP', 'post_stock_adjustments', 1),
  ('JNR_SALES_SUP', 'direct_post_stock_receipts', 0),
  ('JNR_SALES_SUP', 'direct_post_stock_transfers', 0),
  ('JNR_SALES_SUP', 'validate_stock_documents', 1);

UPDATE RoleActionPermission
SET allowed = 1
WHERE role = 'JNR_SALES_SUP'
  AND actionKey IN (
    'draft_stock_receipts',
    'post_stock_receipts',
    'draft_stock_transfers',
    'post_stock_transfers',
    'draft_stock_adjustments',
    'post_stock_adjustments',
    'validate_stock_documents'
  );

UPDATE RoleActionPermission
SET allowed = 0
WHERE role = 'JNR_SALES_SUP'
  AND actionKey IN (
    'receive_stock_transfers',
    'direct_post_stock_receipts',
    'direct_post_stock_transfers'
  );
