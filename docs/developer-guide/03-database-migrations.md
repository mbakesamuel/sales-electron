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
| `src/electron/db/migrations/00N_*.sql` | Incremental migrations (latest: **036**) |
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
| Sales | `Sale`, `SaleLine`, `SaleAppliedTax`, `Payment` (sale payments; distinct from DO payment details) |
| Stock | `StockBalance`, `StockMovement`, receipts/transfers/adjustments (+ lines, `sourceKind` on adjustments) |

Do not dump full SQL into docs — read migrations for authoritative DDL.

## Company settings extras

Notable report-related columns include `hideZeroReportRows`, legacy `stockCommitmentReportComments`, and `reportCommentsJson` (map of report id → comment text). Legacy stock-commitment comments are migrated into the JSON map at startup when needed. Theme columns (migrations 014/015) drive UI theme via company settings / `applyUiTheme`.
