# UI structure

## Entry and routing

- App shell / login → home
- [`src/ui/pages/HomeScreen.tsx`](../../src/ui/pages/HomeScreen.tsx) switches on `route.id` to custom screens or generic table UIs
- Sidebar sections: [`src/ui/navigation/schemaRoutes.ts`](../../src/ui/navigation/schemaRoutes.ts)
- Canonical route ids: [`src/shared/routeCatalog.ts`](../../src/shared/routeCatalog.ts)

## Screen styles

| Kind | Examples |
|------|----------|
| Custom domain | Sales (`SalesClient` / `SalesScreen`), delivery orders (create, list, validation queue, **tracking**, **transfer**), carry-forward, stock hub (**bin card**), reports, budgets, dashboard, **`ChangePasswordScreen`** (first-login gate) |
| Schema/table CRUD | Many org master-data routes via shared table components + `api.db.*` |

## Overview dashboard

Route **Overview** (`overview`) renders the dashboard under `src/ui/dashboard/` (revenue trend, category pie, DO vs sales bars). Data via `window.api.dashboard.getSummary`.

## Reports UI

Under `src/ui/reports/`:

- Sidebar groups: **Daily / Weekly / Monthly** in `schemaRoutes.ts`
- `*Screen.tsx` — toolbar (print, CSV, comments, week/year/date pickers) + document
- `*Document` export — used by Weekly Print Pack where applicable
- Shared: `ReportHeader`, `ReportFooter`, `ReportComments*`
- Secondary windows: [`ReportWindowApp.tsx`](../../src/ui/pages/ReportWindowApp.tsx) bootstraps printable routes from `REPORT_WINDOW_ROUTE_IDS` (including parameterized bin card via `query`).

CSS: `StockCommitmentReport.css` (shared report chrome), plus report-specific **thin overlays** (column widths, section spacing — e.g. `MonthlyPalmOilSalesReport.css`, `SalesBudgetCrosstab.css`, `BinCardReport.css`).

## Forms and dialogs

[`FormDialog.tsx`](../../src/ui/components/FormDialog.tsx) + [`FormDialog.css`](../../src/ui/components/FormDialog.css) — standard modal shell (`form-dialog-panel`, label/control rows, primary/secondary actions). Used by master-data modals (users, customer types, payment methods, tax, etc.) and by **[`CustomerFormModal`](../../src/ui/customers/CustomerFormModal.tsx)** (four-step add/edit customer wizard; tax step labels **Has TPN?** / **Tax Payer's No.**). Keep textareas constrained (`box-sizing`, max-height) so they do not overflow the panel.

## Permissions in UI

Home/nav filters routes by snapshot; screens receive `readOnly` when access is `read`. Action buttons (validate) should check action flags from the permissions snapshot.
