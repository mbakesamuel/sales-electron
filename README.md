# Sales Management Application

Desktop sales and inventory application for palm-oil commercial operations. Built with **Electron**, **Preact**, and **SQLite**.

The window title, installer, and Start Menu / desktop shortcuts use **Sales Management Application**. The npm package name remains `sales-electron` (userData folder is unchanged).

Operators use it to manage customers and products, raise delivery orders and sales invoices, post stock movements, track budgets, and print management reports. Developers extend domain logic in the Electron main process and UI screens in the renderer.

## Requirements

- Windows (primary packaging target)
- Node.js 20+ (for development)
- npm

## Quick start (development)

```bash
npm install
npm run dev
```

This starts the Vite UI and Electron shell together. The local database is created under the Electron `userData` folder as `sales.db`.

## Build / installers

```bash
npm run build          # Typecheck, transpile main process, build renderer
npm run dist:win       # Windows NSIS installer (x64)
```

## Documentation

| Audience | Start here |
|----------|------------|
| Operators | [User guide](docs/user-guide/00-overview.md) |
| Developers | [Developer guide](docs/developer-guide/00-overview.md) |
| Central Sync Server | [PostgreSQL & Hono sync setup](docs/POSTGRES_SYNC_SETUP.md) |
| Index | [docs/README.md](docs/README.md) |

Generate PDF and Word bundles (one document per guide) into `docs/export/`:

```bash
npm run docs:export
```

## Central Synchronization Server (Hono + PostgreSQL)

The application includes an offline-first synchronization engine that pushes local transactions and pulls master data from a central PostgreSQL database via a lightweight Hono.js server (`server/`).

```bash
# Start backend server in development
npm run server:dev

# Run PostgreSQL database migrations
npm run server:migrate

# Reset PostgreSQL tables (clean test data)
npm run server:reset

# Backfill and upload all local SQLite records to PostgreSQL
npm run sync:backfill
```

See [docs/POSTGRES_SYNC_SETUP.md](docs/POSTGRES_SYNC_SETUP.md) for complete server setup instructions.

## Scripts (summary)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev UI + Electron |
| `npm run transpile:electron` | Compile main process + copy migrations/preload |
| `npm run build` | Full production build |
| `npm run dist:win` | Package Windows installer |
| `npm run db:seed` | Seed demo data (Electron) |
| `npm run db:verify` | Schema verification |
| `npm run server:dev` | Start Hono sync API server |
| `npm run server:migrate` | Run PostgreSQL schema migrations |
| `npm run server:reset` | Truncate PostgreSQL tables cleanly |
| `npm run sync:backfill` | Backfill all local SQLite data to PostgreSQL |
| `npm run docs:export` | Export user + developer guides to PDF and Word |

See the [developer guide](docs/developer-guide/02-dev-setup.md) for details.
