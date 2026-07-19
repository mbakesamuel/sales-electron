# UI structure

## Entry and routing

- App shell / login → home
- [`src/ui/pages/HomeScreen.tsx`](../../src/ui/pages/HomeScreen.tsx) switches on `route.id` to custom screens or generic table UIs
- Sidebar sections: [`src/ui/navigation/schemaRoutes.ts`](../../src/ui/navigation/schemaRoutes.ts)
- Canonical route ids: [`src/shared/routeCatalog.ts`](../../src/shared/routeCatalog.ts)

## Screen styles

| Kind | Examples |
|------|----------|
| Custom domain | Sales (`SalesClient`), delivery orders, carry-forward, stock hub, reports, budgets |
| Schema/table CRUD | Many org master-data routes via shared table components + `api.db.*` |

## Reports UI

Under `src/ui/reports/`:

- `*Screen.tsx` — toolbar (print, CSV, comments, week/year pickers) + document
- `*Document` export — used by Weekly Print Pack
- Shared: `ReportHeader`, `ReportFooter`, `ReportComments*`

CSS: `StockCommitmentReport.css` (shared report chrome), plus report-specific sheets (e.g. `SalesBudgetCrosstab.css`).

## Forms and dialogs

`src/ui/components/FormDialog.tsx` — modal shell used by comments editor and other forms. Keep textareas constrained (`box-sizing`, max-height) so they do not overflow the panel.

## Permissions in UI

Home/nav filters routes by snapshot; screens receive `readOnly` when access is `read`. Action buttons (validate) should check action flags from the permissions snapshot.
