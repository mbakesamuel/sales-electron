# Database and migrations

## Engine

- Library: `better-sqlite3`
- Entry: [`src/electron/db/index.ts`](../../src/electron/db/index.ts)
- WAL mode, foreign keys on
- Applied migrations recorded in `schema_migrations`

## Layout

| Path | Role |
|------|------|
| `src/electron/db/migrations/001_init.sql` | Baseline schema for new databases |
| `src/electron/db/migrations/00N_*.sql` | Incremental migrations (latest: **107**) |
| `scripts/generate-schema-sql.mjs` | Schema generation helper |
| `db:seed` / seed migrations | Demo/admin seed data |

Migrations are copied into `dist-electron/electron/db/migrations` at transpile time so packaged apps can apply them.

## Runner behaviour

`runMigrations` applies files in order. Many migrations use **skip helpers** when a column/table already exists (idempotent upgrades) — covering report comments JSON, carry-forward / `sourceKind` columns, report hide-zero settings, budget-by-category changes, tax-table compressions, and similar additive upgrades (roughly migrations 007–016, 019, 025–026, 029, 031, 033–034, among others). After structural migrations, `seedDefaultPermissions` inserts any new route/action defaults with `INSERT OR IGNORE`.

Recent notable migrations:

| Migration | Purpose |
|-----------|---------|
| `035_daily_sales_report_permissions.sql` | Route access for daily sales report |
| `036_customer_type_sales_tax_exempt.sql` | `CustomerTypeDefinition.exemptFromSalesTax` |
| `036_monthly_stock_reconciliation_permissions.sql` | Monthly stock reconciliation report |
| `039_monthly_payment_delivery_permissions.sql` | Monthly Payment/Delivery report |
| `040_monthly_deliveries_by_destination_permissions.sql` | Deliveries by Destination report |
| `041_report_signatory.sql` | `ReportSignatory` history table |
| `042_user_must_change_password.sql` | `User.mustChangePassword` |
| `043_payment_method_bank_transfer.sql` | `BANK_TRANSFER` payment method kind |
| `044_delivery_order_tracking_permissions.sql` | DO tracking route |
| `045_delivery_order_transfer.sql` | DO balance transfer support |
| `046_monthly_palm_oil_sales_permissions.sql` | Monthly Palm Oil Sales report |
| `047_revenue_taxes_report_permissions.sql` | Revenue & taxes report |
| `048_industry_product_monthly_sales_permissions.sql` | Industry product monthly sales report |
| `049_bottled_palm_oil_sales_return_permissions.sql` | Bottled palm oil sales return report |
| `050_other_product_sales_deliveries_permissions.sql` | Other product sales and deliveries report |
| `051_stock_bin_card_permissions.sql` | Bin card + bin card report routes |
| `072_rename_sales_clerk_to_store_keeper.sql` | Store Keeper role rename |
| `078_bottle_oil_registered_customers.sql` | Bottle Oil registered-customer company flag |
| `079_bottle_oil_allow_ration.sql` | Bottle Oil allow-Ration company flag |
| `084_validate_vehicle_consignment_notes.sql` | VCN validate action + route seeds |
| `085_consignment_details.sql` | Consignment note detail columns |
| `086_supervisor_overview.sql` | `vehicle-consignment-validation` route for supervisors (`JNR_SALES_SUP` included) |
| `087_monthly_bottled_oil_report_permissions.sql` | Bottled Oil monthly report route |
| `100_product_omits_storage_location.sql` | Product flag to skip storage location on sales lines |
| `101_storage_location_multi_product.sql` | Storage location multi-product occupancy rules |
| `102_daily_sales_matrix_report_permissions.sql` | Daily sales summary (matrix) report route |
| `103_palm_oil_sales_activity_permissions.sql` | Palm Oil Sales Activity report route |
| `104_disposition_payment_methods.sql` | Ration / Public relation payment method seeds |
| `105_carry_forward_clerk_write.sql` | Statistics clerk write on carry-forward input routes |
| `106_sales_invoice_lock_unit_price.sql` | `CompanySettings.salesInvoiceLockUnitPrice` (default on) |
| `107_sales_budget_revenue_crosstab_permissions.sql` | Sales budget revenue crosstab routes |

When adding a migration:

1. Add `NNN_description.sql` under `migrations/`.
2. Mirror new columns on `001_init.sql` (and schema generator if used) so fresh installs match.
3. If the change is additive and may already exist, add a skip helper in `db/index.ts` like existing ones.
4. If a route is new, add a permissions seed migration or rely on `seedDefaultPermissions` + route catalog.

## Domain tables (summary)

| Domain | Examples |
|--------|----------|
| Auth | `User`, `AuthSession`, `RoleRoutePermission`, `RoleActionPermission` |
| Org | `CompanySettings`, `SalesPoint`, `Location`, `StorageLocation`, `FinancialYearPeriod`, `FinancialMonth`, `CommercialService` |
| Tax / payments | `TaxRegime`, `TaxRateSchedule`, `PaymentMethodDefinition` |
| Catalog | `Product`, `ProductCat`, `ProductUnitPriceSchedule`, budgets/phase tables |
| Customers | `Customer`, `CustomerTypeDefinition` (`exemptFromSalesTax`) |
| Delivery | `DeliveryOrder` (`sourceKind`), `DeliveryOrderDetails`, `DeliveryOrderPaymentDetails` |
| Sales | `Sale`, `SaleLine`, `SaleAppliedTax`, `Payment` (sale payments; cheque/traite/bank fields on `Payment`) |
| Consignment | `VehicleConsignmentNote` (+ detail columns from `085`) |
| Stock | `StockBalance`, `StockMovement`, receipts/transfers/adjustments (+ lines, `sourceKind` on adjustments) |

Do not dump full SQL into docs — read migrations for authoritative DDL.

## Company settings extras

Notable report-related columns include `hideZeroReportRows`, legacy `stockCommitmentReportComments`, and `reportCommentsJson` (map of report id → comment text). Legacy stock-commitment comments are migrated into the JSON map at startup when needed. Theme columns (migrations 014/015) drive UI theme via company settings / `applyUiTheme`. Stock document numbering toggles are `autoGenerateStockReceiptNo` / `autoGenerateStockTransferNo` (migration `064`). Bottle Oil options are `bottleOilUseRegisteredCustomers` (migration `078`) and `bottleOilAllowRation` (migration `079`), both default off.
