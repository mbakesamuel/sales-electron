---
name: Sync DB target switch
overview: Add a startup-time `DB_TARGET` switch on the sync server so it picks between `DATABASE_URL_DEV` and `DATABASE_URL_PROD` from `.env`, with npm/PM2 scripts and health reporting of the active target.
todos:
  - id: db-config-helper
    content: Add server/src/db/config.ts resolving DB_TARGET + DEV/PROD URLs
    status: pending
  - id: wire-db-consumers
    content: Use config in index.ts, migrate.ts, reset.ts; expose target on health
    status: pending
  - id: env-scripts-docs
    content: Update .env.example, ecosystem.config.cjs, POSTGRES_SYNC_SETUP.md
    status: pending
isProject: false
---

# Sync server: switch between dev and production DB

## Approach

**Startup-time selection** (not hot-reload mid-process). Set `DB_TARGET=dev|prod` in the environment; the server resolves one URL and opens a single Postgres pool. Restart to change targets. This avoids mid-sync connection swaps.

Default: `DB_TARGET=dev` for `npm run dev`; `DB_TARGET=prod` for `npm start` / PM2.

## Config shape ([`server/.env`](server/.env) / [`.env.example`](server/.env.example))

```env
DB_TARGET=dev
DATABASE_URL_DEV=postgres://...@localhost:5432/sales_central
DATABASE_URL_PROD=postgres://...@<prod-host>:5432/sales_central
# Optional fallback if only one URL is set today:
# DATABASE_URL=...
```

Resolution order in a small shared helper:

1. If `DB_TARGET=prod` → `DATABASE_URL_PROD` (else fall back to `DATABASE_URL`)
2. If `DB_TARGET=dev` (default) → `DATABASE_URL_DEV` (else fall back to `DATABASE_URL`)
3. Else legacy default `postgres://postgres:postgres@localhost:5432/sales_central`

Log at boot: `Using DB_TARGET=dev (database: sales_central)` — host/db name only, never password.

## Code

### New [`server/src/db/config.ts`](server/src/db/config.ts)

- `loadDbConfig()` → `{ target, databaseUrl, databaseName }`
- Used by [`db/index.ts`](server/src/db/index.ts), [`migrate.ts`](server/src/db/migrate.ts), [`reset.ts`](server/src/db/reset.ts) instead of reading `DATABASE_URL` alone

### Wire consumers

- [`server/src/db/index.ts`](server/src/db/index.ts) — create `sql` from resolved URL; export `getDbTarget()`
- [`migrate.ts`](server/src/db/migrate.ts) / [`reset.ts`](server/src/db/reset.ts) — same helper so migrate/reset hit the selected DB
- [`health.ts`](server/src/routes/health.ts) — include `dbTarget: "dev" | "prod"` and `database` name in the JSON (no credentials)
- [`server/src/index.ts`](server/src/index.ts) — log active target on listen

### Scripts ([`server/package.json`](server/package.json), [`ecosystem.config.cjs`](server/ecosystem.config.cjs))

```json
"dev": "cross-env DB_TARGET=dev tsx watch src/index.ts",
"start": "cross-env DB_TARGET=prod node dist/index.js",
"db:migrate": "tsx src/db/migrate.ts",
"db:migrate:dev": "cross-env DB_TARGET=dev tsx src/db/migrate.ts",
"db:migrate:prod": "cross-env DB_TARGET=prod tsx src/db/migrate.ts",
"db:reset:dev": "cross-env DB_TARGET=dev tsx src/db/reset.ts"
```

On Windows PowerShell without `cross-env`, prefer setting `DB_TARGET` in `.env` and documenting override:

```bash
# .env
DB_TARGET=dev
```

```json
"dev": "tsx watch src/index.ts",
"start:prod-db": "tsx src/index.ts"
```

**Concrete choice for this repo (Windows):** do **not** add `cross-env`. Put `DB_TARGET` in `.env` and allow CLI override via `dotenv` + reading `process.env.DB_TARGET` (shell can set `$env:DB_TARGET="prod"` before `npm run dev`). Add npm scripts that use `dotenv-cli` only if already present — otherwise document:

- Dev: `DB_TARGET=dev` in `.env`
- Prod DB: set `DB_TARGET=prod` in `.env` or PM2 `env: { DB_TARGET: "prod" }`

Update [`ecosystem.config.cjs`](server/ecosystem.config.cjs):

```js
env: { NODE_ENV: "production", DB_TARGET: "prod" }
```

### Docs

Short note in [`docs/POSTGRES_SYNC_SETUP.md`](docs/POSTGRES_SYNC_SETUP.md): two URLs + `DB_TARGET`, restart required to switch, health shows `dbTarget`.

## Safety

- `db:reset` scripts only default to **dev**; prod reset requires explicit `DB_TARGET=prod` (and keep existing confirmations if any)
- Never commit real prod passwords; keep secrets in local `.env` only
- Health exposes target + db name only

## Your `.env` after change

Keep current URL as `DATABASE_URL_DEV` (or both `DATABASE_URL` fallback and `DATABASE_URL_DEV`). Add `DATABASE_URL_PROD` when you have the production connection string. Set `DB_TARGET=dev` or `prod` to switch, then restart the server / PM2.
