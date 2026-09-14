-- 119_sale_cancellation.sql
-- Support cancellation and deletion of validated sales invoices

ALTER TABLE Sale ADD COLUMN cancelledAt TEXT;
ALTER TABLE Sale ADD COLUMN cancelledByUserId TEXT REFERENCES User(id);
ALTER TABLE Sale ADD COLUMN cancelReason TEXT;

CREATE INDEX IF NOT EXISTS Sale_status_cancelled_idx ON Sale (status, cancelledAt);

-- Action permissions for cancelling and deleting validated sales invoices
INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed)
VALUES
  ('ADMIN', 'cancel_validated_sales', 1),
  ('ADMIN', 'delete_validated_sales', 1),
  ('MANAGER', 'cancel_validated_sales', 1),
  ('MANAGER', 'delete_validated_sales', 0),
  ('SENIOR_SALES_SUPERVISOR', 'cancel_validated_sales', 0),
  ('SENIOR_SALES_SUPERVISOR', 'delete_validated_sales', 0),
  ('STATISTICS_CLERK', 'cancel_validated_sales', 0),
  ('STATISTICS_CLERK', 'delete_validated_sales', 0),
  ('STORE_KEEPER', 'cancel_validated_sales', 0),
  ('STORE_KEEPER', 'delete_validated_sales', 0),
  ('JNR_SALES_SUP', 'cancel_validated_sales', 0),
  ('JNR_SALES_SUP', 'delete_validated_sales', 0);
