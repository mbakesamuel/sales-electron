# IPC and preload

## Registration

[`src/electron/main.ts`](../../src/electron/main.ts) calls register functions such as:

- `registerAuthHandlers`
- `registerDatabaseHandlers`
- `registerPermissionsHandlers`
- `registerSalesHandlers`
- `registerDeliveryOrdersHandlers`
- `registerCarryForwardHandlers` / `registerCarryForwardStockHandlers`
- `registerStockHandlers`
- `registerReportsHandlers`
- `registerFinancialYearsHandlers`
- `registerDashboardHandlers`
- `registerDialogHandlers`
- `registerPrintHandlers`

Each module lives under `src/electron/ipc/`.

## Preload surface

[`src/electron/preload.cjs`](../../src/electron/preload.cjs) exposes `window.api` namespaces: `db`, `auth`, `permissions`, `sales`, `deliveryOrders`, `carryForward`, `carryForwardStock`, `stock`, `reports`, `financialYears`, `dashboard`, dialogs/print helpers as defined in the file.

Typed on the UI side via `src/ui/types/electron.d.ts`.

**After editing preload**, always re-run `transpile:electron` (copies `.cjs` into `dist-electron`) and restart Electron.

## Auth tokens on invoke

Many handlers take `authToken` as the first payload argument after the event. Renderer helpers:

- `getAuthenticatedReports()` — `src/ui/auth/reports.ts`
- `getAuthenticatedDashboard()` — dashboard summary
- Similar patterns for sales / financial years / other domains

## Adding an IPC method

1. Implement service function in the domain folder.
2. `ipcMain.handle('ns:method', …)` in the ipc module.
3. Add preload binding.
4. Extend `electron.d.ts` (+ shared API types if needed).
5. Call from UI through the typed API.

Channel names are stringly; keep them namespaced (`sales:`, `reports:`, `dashboard:`, …).
