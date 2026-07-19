# Dev setup

## Prerequisites

- Node.js 20+ and npm
- Windows recommended (matches packaging); Electron runs elsewhere but NSIS pack is Windows-focused
- Native module `better-sqlite3` (built via `postinstall` / electron-builder)

## Install and run

```bash
npm install
npm run dev
```

`npm run dev` runs Vite (`dev:react`) and Electron (`dev:electron`) in parallel. Electron waits for `http://localhost:5173`, then loads it.

After changing **main-process** TypeScript, re-run transpile (dev script does one transpile at start):

```bash
npm run transpile:electron
```

Then restart Electron (or the whole `npm run dev`). Renderer HMR does not reload main/preload.

## Database location

```text
{app.getPath('userData')}/sales.db
```

On Windows this is typically under `%APPDATA%\sales-electron\sales.db` for the `sales-electron` package name.

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run transpile:electron` | `tsc -p tsconfig.electron.json` + copy migrations + preload |
| `npm run transpile:electron:watch` | Watch main TS |
| `npm run db:seed` | Seed via Electron script |
| `npm run db:reset` | Reset DB helper |
| `npm run db:generate-schema` | Regenerate schema SQL helper |
| `npm run db:verify` | Schema verify under Electron |
| `npm run db:verify-auth` | Auth verify |
| `npm run verify:tax-rules` | Tax rules check |
| `npm run verify:tax-schema` | Tax schema check |

## Typecheck

```bash
npx tsc -b
npm run transpile:electron
```

Full production path: `npm run build` (see [Build and packaging](09-build-and-packaging.md)).
