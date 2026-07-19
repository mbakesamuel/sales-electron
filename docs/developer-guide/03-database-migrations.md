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
| `src/electron/db/migrations/00N_*.sql` | Incremental migrations |
| `scripts/generate-schema-sql.mjs` | Schema generation helper |
| `db:seed` / seed migrations | Demo/admin seed data |

Migrations are copied into `dist-electron/electron/db/migrations` at transpile time so packaged apps can apply them.

## Runner behaviour

`runMigrations` applies files in order. Some migrations use **skip helpers** when a column/table already exists (idempotent upgrades), for example report comments JSON and carry-forward columns. After structural migrations, `seedDefaultPermissions` inserts any new route/action defaults with `INSERT OR IGNORE`.

When adding a migration:

1. Add `NNN_description.sql` under `migrations/`.
2. Mirror new columns on `001_init.sql` (and schema generator if used) so fresh installs match.
3. If the change is additive and may already exist, add a skip helper in `db/index.ts` like existing ones.
4. If a route is new, add a permissions seed migration or rely on `seedDefaultPermissions` + route catalog.

## Domain tables (summary)

| Domain | Examples |
|--------|----------|
| Auth | `User`, `AuthSession`, `RoleRoutePermission`, `RoleActionPermission` |
| Org | `CompanySettings`, `SalesPoint`, `Location`, `StorageLocation`, `FinancialYearPeriod`, `FinancialMonth` |
| Catalog | `Product`, `ProductCat`, `ProductUnitPriceSchedule`, budgets/phase tables |
| Customers | `Customer`, `CustomerTypeDefinition` |
| Delivery | `DeliveryOrder`, `DeliveryOrderDetails`, payments |
| Sales | `Sale`, `SaleLine`, `SaleAppliedTax`, `Payment` |
| Stock | `StockBalance`, `StockMovement`, receipts/transfers/adjustments (+ lines) |

Do not dump full SQL into docs — read migrations for authoritative DDL.

## Company settings extras

Notable report-related columns include `hideZeroReportRows`, legacy `stockCommitmentReportComments`, and `reportCommentsJson` (map of report id → comment text). Legacy stock-commitment comments are migrated into the JSON map at startup when needed.
