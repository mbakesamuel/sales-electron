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
| Index | [docs/README.md](docs/README.md) |

Generate PDF and Word bundles (one document per guide) into `docs/export/`:

```bash
npm run docs:export
```

## Scripts (summary)

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev UI + Electron |
| `npm run transpile:electron` | Compile main process + copy migrations/preload |
| `npm run build` | Full production build |
| `npm run dist:win` | Package Windows installer |
| `npm run db:seed` | Seed demo data (Electron) |
| `npm run db:verify` | Schema verification |
| `npm run docs:export` | Export user + developer guides to PDF and Word |

See the [developer guide](docs/developer-guide/02-dev-setup.md) for details.
