# Architecture

## High-level

```mermaid
flowchart TB
  subgraph renderer [Renderer_Preact_Vite]
    UI[Screens_and_forms]
    AuthUI[Auth_and_permissions_UI]
    SyncUI[Sync_status_and_settings]
    UI --> PreloadAPI["window.api"]
    AuthUI --> PreloadAPI
    SyncUI --> PreloadAPI
  end

  subgraph preload [Preload_cjs]
    Bridge[contextBridge]
    PreloadAPI --> Bridge
  end

  subgraph main [Electron_main]
    IPC[ipcMain_handlers]
    Domain[Domain_services]
    SyncEng[Sync_service_and_outbox]
    NetMon[Network_monitor]
    DB[(SQLite_sales.db)]
    Bridge -->|invoke| IPC
    IPC --> Domain
    IPC --> SyncEng
    Domain --> DB
    Domain -->|enqueue_outbox| SyncEng
    SyncEng --> DB
    SyncEng --> NetMon
  end

  subgraph central [Central_server]
    HonoAPI[Hono_API_port_3001]
    Postgres[(PostgreSQL_sales_central)]
    SyncEng -->|HTTP_POST_push| HonoAPI
    SyncEng -->|HTTP_GET_pull| HonoAPI
    NetMon -->|HTTP_health_ping| HonoAPI
    HonoAPI --> Postgres
  end
```

## Process boundaries

- **Renderer** (`src/ui/`) — presentation only. It must not open SQLite directly.
- **Preload** (`src/electron/preload.cjs`) — exposes a curated `window.api` surface; no Node integration in the page.
- **Main** (`src/electron/main.ts`) — creates the `BrowserWindow`, initializes the DB, registers IPC handlers, handles print/dialogs, and runs the background synchronization engine (`SyncService`).
- **Central API** (`server/src/index.ts`) — Hono.js HTTP server running on port 3001 that receives batched push transactions and serves delta master-data pulls to/from PostgreSQL.

## Startup sequence

1. `app.whenReady`
2. `Menu.setApplicationMenu(null)` — hide the default application menu
3. `initDatabase()` — open `userData/sales.db`, run migrations, seed default permissions
4. `backfillFinancialMonths()` — ensure month rows exist for open financial years
5. Register IPC modules (auth, db, sales, deliveryOrders, stock, reports, financial years, dashboard, carry-forward, print, booklets, sync, …)
6. `getSyncService().init()` — start background network monitor and auto-sync scheduler (`syncNow` / backfill continue while outbox has PENDING **or** FAILED items)
7. Create `BrowserWindow` with title **Sales Management Application**; load Vite dev URL or production `dist-react` index

Window chrome title is set on `BrowserWindow` and in `index.html`. Packaged `productName` and Start Menu / desktop shortcuts use **Sales Management Application** (see [Build and packaging](09-build-and-packaging.md)). The npm package / userData folder remains `sales-electron`.

## Shared types

Cross-cutting TypeScript types live under `src/shared/` (routes, permissions, report payloads, sales types). Main imports them as `.js` emit paths; the UI imports `.ts` sources via Vite.

## Design rules

- Business rules and SQL belong in `src/electron/**` services.
- UI calls authenticated wrappers (e.g. `getAuthenticatedReports()`) that attach the session token.
- Reports are pure builders: load settings + query DB → typed payload → Preact document component for screen/print.
