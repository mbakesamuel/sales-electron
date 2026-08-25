-- Direct-validate sales invoice action (create and validate in one step).
-- Safe to re-run; INSERT OR IGNORE.

INSERT OR IGNORE INTO RoleActionPermission (role, actionKey, allowed) VALUES
  ('ADMIN', 'direct_validate_sales', 1),
  ('MANAGER', 'direct_validate_sales', 1),
  ('SENIOR_SALES_SUPERVISOR', 'direct_validate_sales', 0),
  ('STATISTICS_SUPERVISOR', 'direct_validate_sales', 0),
  ('SALES_CLERK', 'direct_validate_sales', 0);
