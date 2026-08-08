# Developer guide — overview

This guide explains how **Sales Management Application** (npm package `sales-electron`) is structured so you can change domain logic, reports, UI, or packaging safely.

The Electron window title, installer `productName`, and Start Menu / desktop shortcuts are **Sales Management Application**. The technical package folder under userData remains `sales-electron`. See [Build and packaging](09-build-and-packaging.md).

## Stack

| Layer | Tech |
|-------|------|
| Shell | Electron |
| UI | Preact + Vite |
| Main process | TypeScript → `dist-electron/` |
| Database | SQLite (`better-sqlite3`), file `sales.db` under Electron `userData` |
| Bridge | `contextBridge` preload → `window.api` |

## Doc map

1. [Architecture](01-architecture.md)
2. [Dev setup](02-dev-setup.md)
3. [Database and migrations](03-database-migrations.md)
4. [Auth and permissions](04-auth-permissions.md)
5. [Domain modules](05-domain-modules.md)
6. [Reports engine](06-reports-engine.md)
7. [IPC and preload](07-ipc-and-preload.md)
8. [UI structure](08-ui-structure.md)
9. [Build and packaging](09-build-and-packaging.md)

## Operator docs

Workflows and screen behaviour: [User guide](../user-guide/00-overview.md).
