# Reports engine

## Pattern

Each report:

1. **Builder** in `src/electron/reports/*.ts` returns a typed payload from `src/shared/reports.types.ts`.
2. **IPC** in `src/electron/ipc/reports.ts` authenticates and calls the builder.
3. **Screen + Document** in `src/ui/reports/*` — Document components render the printable report body.

## Shared helpers

| Helper | File | Role |
|--------|------|------|
| Company / display / comments | `companySettings.ts` | Header fields, `hideZeroReportRows`, `loadReportSignatory` / `loadReportCompanySettings(userId?, asAtIso?)`, `loadReportComments` / `saveReportComments` |
| Report signatory CRUD | `reportSignatory.ts` | List / upsert / delete `ReportSignatory` (gated by `report-settings` write) |
| Products, packs, qty | `shared.ts` | `loadProducts`, `detectBottledPack`, `PALM_OIL_KG_PER_LITRE` |
| As-at date | `financialYears/service.ts` → `resolveReportAsAt` | `min(today, open month endDate)` — reopening a past month prints as at that month’s end |
| Stock qty on stock reports | `stock/asOfBalance.ts` → `loadStockBalancesAsOf` | Reconstruct from `StockMovement` through as-at (not live `StockBalance`) |
| Commitment outstanding | `commitmentAsOf.ts` → `loadOutstandingCommitmentsAsOf` | Validated DOs with `dateIssued ≤ as-at`, minus sales on those DOs with `dateIssued ≤ as-at` |
| Open-month week choices | `weekChoices.ts` | Shared by Sales/delivery and Bottled Sales Report |

### Report comments

- Storage: `CompanySettings.reportCommentsJson` — JSON map keyed by route id (e.g. `sales-delivery-report`, `monthly-delivery-report-h1`).
- IPC: `reports:saveReportComments` merges one key atomically.
- UI: `ReportCommentsEditor` / `ReportCommentsSection`.

### Report signatory

- Storage: `ReportSignatory` (migration `041_report_signatory.sql`) — free-text `name`, `title`, unique `effectiveFrom` (YYYY-MM-DD).
- Resolve: `loadReportSignatory(asAtIso)` → latest row with `effectiveFrom <= asAt`; folded into `ReportCompanySettings.signatoryName` / `signatoryTitle`. Fallback defaults match the seeded row.
- IPC: `reports:listSignatories` / `getSignatory` / `upsertSignatory` / `deleteSignatory`.
- UI: Report settings screen; `ReportFooter` takes `name` / `label` from settings (no hardcoded defaults).

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
- Open-month only: opening LPO = balances as of day before month start **plus** posted **carry-forward** (Opening Stock balances) LPO adjustments in the open month through as-at; posted receipts by `supplierLabel`; validated LPO sales by customer-type buckets; calculated = opening + reception − issues; physical/variance blank; BPO issued + stock C/F; fixed palm-kernel / related product rows.
- UI: `MonthlyStockReconciliationScreen.tsx` — print / CSV / comments.

## Monthly Payment/Delivery

File: `monthlyPaymentDeliveryReport.ts`

- IPC: `reports:getMonthlyPaymentDelivery`.
- Route: `monthly-payment-delivery-report` (Reports → Monthly).
- Permissions seeded in migration `039_monthly_payment_delivery_permissions.sql`.
- Open-month weeks via `buildWeekChoices`; validated sales: **Payments** = `isBottled` kg + `lineNet`; **Deliveries** = non-bottled kg + `lineNet`.
- UI: `MonthlyPaymentDeliveryScreen.tsx` — sample-style WEEKS/DATES/PAYMENTS/DELIVERIES table; print / CSV / comments.

## Deliveries by Destination

File: `monthlyDeliveriesByDestinationReport.ts`

- IPC: `reports:getMonthlyDeliveriesByDestination`.
- Route: `monthly-deliveries-by-destination-report` (Reports → Monthly).
- Permissions seeded in migration `040_monthly_deliveries_by_destination_permissions.sql`.
- Open-month weeks; validated non-bottled sales kg by destination (Industries / Wholesales / Retail / CDC Workers / Makoko Farms); TOTAL and TOTAL % rows.
- UI: `MonthlyDeliveriesByDestinationScreen.tsx` — print / CSV / comments.

## Monthly Palm Oil Sales

File: `monthlyPalmOilSalesReport.ts`

- IPC: `reports:getMonthlyPalmOilSales`.
- Route: `monthly-palm-oil-sales-report` (Reports → Monthly).
- Permissions seeded in migration `046_monthly_palm_oil_sales_permissions.sql`.
- Full calendar FY; validated sales through as-at; LPO (main non-bottled) by destination (customer name + type; Makoko supported); BPO bottled aggregate; tons + tax-excl. value.
- UI: `MonthlyPalmOilSalesScreen.tsx` — Jan–Jul and Aug–Dec+TOTAL tables; print / CSV / comments.

## Revenue & taxes

File: `revenueTaxesReport.ts`

- IPC: `reports:getRevenueTaxes`.
- Route: `revenue-taxes-report` (Reports → Monthly).
- Permissions seeded in migration `047_revenue_taxes_report_permissions.sql`.
- Validated invoices by `dateIssued` through as-at; open month or FY to date; optional sales point.
- Totals: net (`Sale.netAmount`), VAT (`Sale.vatAmount`), sales tax (`SaleAppliedTax` / `SALES_TAX`), gross; breakdowns by day or month and by sales point.
- UI: `RevenueTaxesReportScreen.tsx` — summary table + breakdown tables; print / CSV / comments.

## Industry product monthly sales

File: `industryProductMonthlySalesReport.ts`

- IPC: `reports:getIndustryProductMonthlySales`.
- Route: `industry-product-monthly-sales-report` (Reports → Monthly).
- Permissions seeded in migration `048_industry_product_monthly_sales_permissions.sql`.
- Full calendar FY through as-at; Industry customers only; one section per non-LPO (`!isMain`) non-bottled product; rows = sales points + TOTAL; tons + tax-excl. value.
- UI: `IndustryProductMonthlySalesScreen.tsx` — stacked product sections; Jan–Jul and Aug–Dec+TODATE; A4 portrait print / CSV / comments.

## Bottled palm oil sales return

File: `bottledPalmOilSalesReturnReport.ts`

- IPC: `reports:getBottledPalmOilSalesReturn`.
- Route: `bottled-palm-oil-sales-return-report` (Reports → Monthly).
- Permissions seeded in migration `049_bottled_palm_oil_sales_return_permissions.sql`.
- Open month through as-at; B/F = prior sellable bottled + in-month `CARRY_FORWARD`; receptions by `supplierLabel`; Cash Sales (`NORMAL`) vs GM's Public Relations (`PUBLIC_RELATION`); RATION omitted; packs 20L / 3×5L / 1×15L.
- UI: `BottledPalmOilSalesReturnScreen.tsx` — spreadsheet layout; A4 portrait print / CSV / comments.

## Bottled Oil monthly

File: `monthlyBottledOilReport.ts`

- IPC: `reports:getMonthlyBottledOil`.
- Route: `monthly-bottled-oil-report` (Reports → Monthly).
- Permissions seeded in migration `087_monthly_bottled_oil_report_permissions.sql`.
- Open month through as-at; validated Bottle Oil **Ration** / **Public relation** only; one row per sale with pack qty (1x20L / 3x5L / 1x15L via `detectBottledPack`), gross amount, customer address, VCN `consignmentNoteNo` + receiver name (left join).
- UI: `MonthlyBottledOilReportScreen.tsx` — sample-style table; usual `ReportHeader` / `ReportFooter`; print / CSV / comments.

## Other product sales and deliveries

File: `otherProductSalesDeliveriesReport.ts`

- IPC: `reports:getOtherProductSalesDeliveries`.
- Route: `other-product-sales-deliveries-report` (Reports → Monthly).
- Permissions seeded in migration `050_other_product_sales_deliveries_permissions.sql`.
- Open month through as-at; non-LPO (`!isMain`) non-bottled products only; grouped by sales point × product with activity; all qty/value under DELIVERIES (`qtyKg` + `lineNet`); PAYMENTS blank.
- UI: `OtherProductSalesDeliveriesScreen.tsx` — SUBTOTAL per SP + GRAND TOTAL; print / CSV / comments.

## Bin card report (stock)

Not a sidebar report route — opened from **Bin card** with filter query.

- Builder: `getBinCard` in `src/electron/stock/binCard.ts` (ledger lines, opening/closing balance, truncation at 5 000 rows).
- Report route: `stock-bin-card-report`; bootstrap includes optional `query` on `ReportWindowBootstrap`.
- UI: `BinCardReportScreen.tsx` — `ReportHeader`, `scr-document` / `scr-table`, opening/closing as `scr-row-total`.
- Window: `openOrFocusReportWindow` uses portrait dimensions for this route id; print injects `@page { size: A4 portrait }` in `BinCardReport.css`.

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
| `monthlyPaymentDeliveryReport.ts` | Monthly Payment/Delivery (weekly bottled vs other kg + value) |
| `monthlyDeliveriesByDestinationReport.ts` | Deliveries by Destination (weekly non-bottled kg by customer type) |
| `monthlyPalmOilSalesReport.ts` | Monthly Palm Oil Sales (FY LPO destinations + BPO tons/'000 FRS) |
| `revenueTaxesReport.ts` | Revenue & taxes (validated net / VAT / sales tax / gross) |
| `industryProductMonthlySalesReport.ts` | Industry product monthly sales (FY SP × month tons/'000 FRS) |
| `bottledPalmOilSalesReturnReport.ts` | Bottled palm oil sales return (open-month B/F / reception / issues / balance) |
| `monthlyBottledOilReport.ts` | Bottled Oil monthly (Ration/PR invoice rows + packs + VCN) |
| `otherProductSalesDeliveriesReport.ts` | Other product sales and deliveries (SP × product, deliveries only) |
| `salesBudgetMonthlyCrosstab.ts` / `Weekly` | Budget crosstabs |
| `binCard.ts` (stock) | Bin card printable ledger (parameterized report window) |

## UI / print

Shared report chrome lives in **`StockCommitmentReport.css`** (`scr-page`, `scr-toolbar`, `scr-document`, `scr-table`, `scr-num`, `scr-row-total`, `scr-row-header`, `scr-bottled-block`, etc.). Newer monthly reports add a **thin overlay** CSS file (e.g. `MonthlyPalmOilSalesReport.css`, `SalesBudgetCrosstab.css`, `BinCardReport.css`) for column widths and section spacing only — not duplicate borders, gray theads, or custom print body classes.

- Class **`scr-print-mode`** on `body` during print (preferred over injecting `@page` styles per screen, except landscape packs and bin-card portrait).
- **`no-print`** hides toolbars and filters.
- Printable reports open in a secondary Electron window (`REPORT_WINDOW_ROUTE_IDS`); `windows:openReport` accepts optional **`query`** for parameterized reports (bin card).
- **`formatPhasedQtyKgDisplay`** (`salesBudgetPhase.ts`) — kg cells in budget phasing / crosstabs: thousand separators, 0 decimal places.
- Sidebar groups reports under **Daily / Weekly / Monthly** in `schemaRoutes.ts`.

### Sales budget UI

- Phasing screen: `SalesBudgetScreen.tsx` + `SalesBudgetScreen.css` (14px base; annual qty saved rounded, displayed with `toLocaleString`).
- Crosstabs: `SalesBudgetMonthlyCrosstabScreen.tsx`, `SalesBudgetWeeklyCrosstabScreen.tsx` + `SalesBudgetCrosstab.css` (shared 14px root on `.sbc-root`).
