# Reports engine

## Pattern

Each report:

1. **Builder** in `src/electron/reports/*.ts` returns a typed payload from `src/shared/reports.types.ts`.
2. **IPC** in `src/electron/ipc/reports.ts` authenticates and calls the builder.
3. **Screen + Document** in `src/ui/reports/*` — Document is reusable inside Weekly Print Pack.

## Shared helpers

| Helper | File | Role |
|--------|------|------|
| Company / display / comments | `companySettings.ts` | Header fields, `hideZeroReportRows`, `loadReportComments` / `saveReportComments` |
| Products, packs, qty | `shared.ts` | `loadProducts`, `detectBottledPack`, `PALM_OIL_KG_PER_LITRE` |
| As-at date | `financialYears/service.ts` → `resolveReportAsAt` | Today clamped to open FY |

### Report comments

- Storage: `CompanySettings.reportCommentsJson` — JSON map keyed by route id (e.g. `sales-delivery-report`, `monthly-delivery-report-h1`).
- IPC: `reports:saveReportComments` merges one key atomically.
- UI: `ReportCommentsEditor` / `ReportCommentsSection`.

### Category bucketing

Reports branch on `ProductCat.isMain` and `isBottled`. Kernel/PKO detection also uses name heuristics in stock/monthly builders (`KERNEL OIL`, `PKO`).

## Weekly deliveries (Sales / delivery)

File: `weeklyDeliveriesReport.ts`

- Local `toIsoDate` (not `Date.toISOString`) for week bounds.
- `weekChoices` = weeks overlapping open month up to as-at.
- Optional IPC arg `weekMondayIso`.
- Sections: loose (main), bottled packs, `miscSection` titled **3) OTHER PRODUCTS / PKO**.

## Other builders (quick index)

| Builder | Report |
|---------|--------|
| `stockCommitment.ts` | Stock summary / stock & commitment |
| `stockReport.ts` | Stock report |
| `commitmentReport.ts` | Commitment report |
| `bottleOilStockSalesReport.ts` | Bottle oil stock & sales |
| `bottledWeeklyIssuesReport.ts` | Bottled weekly issues |
| `monthlyDeliveryReport.ts` | Monthly H1/H2 |
| `salesBudgetMonthlyCrosstab.ts` / `Weekly` | Budget crosstabs |

## UI / print

- Class `scr-print-mode` on `body` during print.
- `no-print` hides toolbars.
- Weekly Print Pack fetches default payloads (current week for deliveries) and renders Document components only.
