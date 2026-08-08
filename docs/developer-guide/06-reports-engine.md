# Reports engine

## Pattern

Each report:

1. **Builder** in `src/electron/reports/*.ts` returns a typed payload from `src/shared/reports.types.ts`.
2. **IPC** in `src/electron/ipc/reports.ts` authenticates and calls the builder.
3. **Screen + Document** in `src/ui/reports/*` — Document is reusable inside Weekly Print Pack where applicable.

## Shared helpers

| Helper | File | Role |
|--------|------|------|
| Company / display / comments | `companySettings.ts` | Header fields, `hideZeroReportRows`, `loadReportComments` / `saveReportComments` |
| Products, packs, qty | `shared.ts` | `loadProducts`, `detectBottledPack`, `PALM_OIL_KG_PER_LITRE` |
| As-at date | `financialYears/service.ts` → `resolveReportAsAt` | `min(today, open month endDate)` — reopening a past month prints as at that month’s end |
| Stock qty on stock reports | `stock/asOfBalance.ts` → `loadStockBalancesAsOf` | Reconstruct from `StockMovement` through as-at (not live `StockBalance`) |
| Commitment outstanding | `commitmentAsOf.ts` → `loadOutstandingCommitmentsAsOf` | Validated DOs with `dateIssued ≤ as-at`, minus sales on those DOs with `dateIssued ≤ as-at` |
| Open-month week choices | `weekChoices.ts` | Shared by Sales/delivery, Bottled Sales Report, Weekly print pack |

### Report comments

- Storage: `CompanySettings.reportCommentsJson` — JSON map keyed by route id (e.g. `sales-delivery-report`, `monthly-delivery-report-h1`).
- IPC: `reports:saveReportComments` merges one key atomically.
- UI: `ReportCommentsEditor` / `ReportCommentsSection`.

### Category bucketing

Reports branch on `ProductCat.isMain` and `isBottled`. Kernel/PKO detection also uses name heuristics in stock/monthly builders (`KERNEL OIL`, `PKO`).

## Daily sales report

File: `dailySalesReport.ts`

- IPC: `reports:getDailySales` with `reportDateIso` and optional `salesPointId`.
- Route: `daily-sales-report` (Reports → Daily).
- Permissions seeded in migration `035_daily_sales_report_permissions.sql`.
- UI: `DailySalesReportScreen.tsx` — validated sales by product for the date; DO / vehicle / balance columns; customer-type summary; print / CSV / comments.

## Weekly deliveries (Sales/delivery)

File: `weeklyDeliveriesReport.ts`

- Local `toIsoDate` (not `Date.toISOString`) for week bounds.
- `weekChoices` = weeks overlapping open month up to as-at.
- Optional IPC arg `weekMondayIso`.
- Sections: loose (main), bottled packs, `miscSection` titled **3) OTHER PRODUCTS / PKO**.

## Monthly stock reconciliation

File: `monthlyStockReconciliationReport.ts`

- IPC: `reports:getMonthlyStockReconciliation`.
- Route: `monthly-stock-reconciliation-report` (Reports → Monthly).
- Permissions seeded in migration `036_monthly_stock_reconciliation_permissions.sql`.
- Open-month only: opening LPO from balances as of day before month start; posted receipts by `supplierLabel`; validated LPO sales by customer-type buckets; calculated = opening + reception − issues; physical/variance blank; BPO issued + stock C/F; fixed palm-kernel / related product rows.
- UI: `MonthlyStockReconciliationScreen.tsx` — print / CSV / comments.

## Other builders (quick index)

| Builder | Report |
|---------|--------|
| `dailySalesReport.ts` | Daily sales report |
| `stockCommitment.ts` | Stock summary / stock & commitment |
| `stockReport.ts` | Stock report |
| `commitmentReport.ts` | Commitment report |
| `bottleOilStockSalesReport.ts` | Bottle oil stock & sales |
| `bottledWeeklyIssuesReport.ts` | Bottled Sales Report (sidebar label; route still `bottled-weekly-issues-report`) |
| `monthlyDeliveryReport.ts` | Monthly H1/H2 |
| `monthlyStockReconciliationReport.ts` | Monthly stock reconciliation (open month; LPO + BPO + kernel) |
| `salesBudgetMonthlyCrosstab.ts` / `Weekly` | Budget crosstabs |

## UI / print

- Class `scr-print-mode` on `body` during print.
- `no-print` hides toolbars.
- Weekly Print Pack fetches default payloads (current week for deliveries) and renders Document components only; selectable items include Sales/delivery, Bottled Sales Report, and Sales budget (weekly).
- Sidebar groups reports under **Daily / Weekly / Monthly** in `schemaRoutes.ts`.
