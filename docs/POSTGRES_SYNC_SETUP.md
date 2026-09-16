# Central PostgreSQL Synchronization with Hono.js

This document provides complete technical instructions on running, operating, and troubleshooting the offline-first synchronization between local Electron SQLite instances and the central PostgreSQL database via the Hono.js API.

---

## 1. System Architecture

The application uses an **offline-first, transactional outbox architecture** with a **hybrid two-way synchronization model**:

```
+-----------------------------------------------------------------------------------+
|                              Local Electron Desktop                               |
|                                                                                   |
|  +--------------------+       +-----------------------+     +-------------------+ |
|  | Preact UI          | <---> | Sync Service Engine   | --> | SQLite Database   | |
|  | - SyncStatusBadge  | (IPC) | - Network Monitor     |     | - SyncOutbox      | |
|  | - SyncSettings     |       | - Outbox Serializer   |     | - SyncState       | |
|  +--------------------+       +-----------------------+     +-------------------+ |
+-------------------------------------------|---------------------------------------+
                                            | (HTTP / JSON)
                                            v
+-----------------------------------------------------------------------------------+
|                         Central Synchronization Server                            |
|                                                                                   |
|                   +--------------------------------------------+                  |
|                   |  Hono.js API Server (@hono/node-server)   |                  |
|                   |  - GET  /api/health                        |                  |
|                   |  - POST /api/sync/push                     |                  |
|                   |  - GET  /api/sync/pull                     |                  |
|                   |  - POST /api/sync/bootstrap-master         |                  |
|                   +--------------------------------------------+                  |
|                                         |                                         |
|                                         v (postgres.js)                           |
|                   +--------------------------------------------+                  |
|                   |  PostgreSQL 16+ Central Database           |                  |
|                   |  - sales, sale_lines, payments             |                  |
|                   |  - delivery_orders, details                |                  |
|                   |  - stock_receipts, transfers, adjustments  |                  |
|                   |  - customers, products, catalog, users     |                  |
|                   +--------------------------------------------+                  |
+-----------------------------------------------------------------------------------+
```

### Key Principles

1. **Local-First Reliability**: Operators work entirely against their local SQLite database (`sales.db`). Sales invoices, delivery orders, stock movements, and customer edits are saved locally with zero network latency.
2. **Transactional Outbox Pattern**: Every local write operation automatically enqueues an `UPSERT`, `UPDATE`, or `DELETE` mutation into the `SyncOutbox` table within the same SQLite ACID transaction.
3. **Heartbeat & Network Detection**: The `NetworkMonitor` polls `/api/health` every 30 seconds. When the server goes offline, local work continues uninterrupted. When the server comes back online, a push/pull sync triggers automatically.
4. **Two-Way Hybrid Sync**:
   - **Upward (Push)**: Transactional data created at local terminals (`Sale`, `DeliveryOrder`, `StockReceipt`, `StockTransfer`, `StockAdjustment`, `Customer`, `DocumentBooklet`) is pushed to PostgreSQL.
   - **Downward (Pull)**: Master data managed centrally (`Product`, `ProductUnitPriceSchedule`, `CustomerTypeDefinition`, `TaxRegime`, `TaxRateSchedule`, `PaymentMethodDefinition`, `SalesPoint`, `StorageLocation`, `Role`, `User`, `RoleRoutePermission`, `RoleActionPermission`, `CompanySettings`) is pulled down into SQLite via delta queries (`?since=ISO_TIMESTAMP`).

---

## 2. Server Quickstart

The sync API backend is located in the `server/` directory and is built using **Hono.js** and **postgres.js**.

### Option A: Running with Docker Compose (Recommended)

1. Open a terminal and navigate to the `server/` directory:
   ```bash
   cd server
   docker compose up -d --build
   ```
2. PostgreSQL will start on port `5432` and the Hono sync API will start on port `3001`.

### Option B: Running with PM2 (Recommended on Host / Windows)

1. Ensure PostgreSQL is running.
2. From the project root, start the server in the background using PM2:
   ```bash
   npm run server:start
   ```
   This compiles TypeScript and starts the application as a daemon named `sales-sync-server`.
3. Check status and logs:
   ```bash
   npm run server:status
   npm run server:logs
   ```
4. Save the PM2 process list to auto-start on boot:
   ```bash
   pm2 save
   ```

### Option C: Running Manually in Development

1. Ensure a PostgreSQL instance is running on port `5432`.
2. Configure environment variables in `server/.env` (copied from `server/.env.example`):
   ```env
   PORT=3001
   HOST=0.0.0.0
   DATABASE_URL=postgres://postgres:your_password@localhost:5432/sales_central
   API_SECRET_KEY=your-generated-secret-key-here
   CORS_ORIGIN=*
   ```
3. From the project root directory, install and run migrations:
   ```bash
   # Install server dependencies (only needed once)
   npm --prefix server install

   # Run schema migration (creates sales_central database and tables)
   npm run server:migrate

   # Start the development server (watches for changes)
   npm run server:dev
   ```
4. Verify the server is running by opening:
   ```
   http://localhost:3001/api/health
   ```
   Expected response:
   ```json
   {
     "ok": true,
     "version": "1.0.0",
     "service": "sales-sync-server",
     "serverTime": "2026-09-07T08:56:33.015Z",
     "database": "connected"
   }
   ```

---

## 3. Server Management Scripts

All server operations can be executed from the project root using npm scripts:

| Command | Purpose |
| :--- | :--- |
| `npm run server:start` | Builds TypeScript and starts the Hono sync API daemon in PM2. |
| `npm run server:stop` | Stops the PM2 sync server daemon. |
| `npm run server:restart` | Restarts the PM2 sync server daemon. |
| `npm run server:logs` | Streams live server logs from PM2. |
| `npm run server:status` | Shows status, CPU, and memory consumption in PM2. |
| `npm run server:dev` | Starts the Hono development server in foreground with auto-reload (`tsx watch src/index.ts`). |
| `npm run server:migrate` | Connects to PostgreSQL, creates `sales_central` if missing, and executes `postgres_schema.sql`. |
| `npm run server:reset` | Cascading truncation of all operational and reference tables in PostgreSQL (cleans test data). |
| `npm run sync:backfill` | CLI backfill script that uploads all local SQLite records from `AppData/Roaming/sales-electron/sales.db` into PostgreSQL. |

---

## 4. Desktop Application Configuration

1. Launch the desktop application and sign in as an **ADMIN** user.
2. In the navigation sidebar, go to **General Parameters** → **Data sync** (route `sync-settings`).
3. Configure the following parameters:
   - **Hono Central API URL**: `http://localhost:3001` (or your central server IP / domain name, e.g. `http://192.168.1.50:3001` or `https://sync.yourcompany.com`).
   - **Device API Token**: Enter the secret token matching `API_SECRET_KEY` in `server/.env` (or a dedicated device token from the `devices` table).
   - **Terminal / Device identifier**: A distinct name for this computer (e.g. `terminal-cashier-01`, `terminal-branch-douala`).
   - **Enable automatic background sync**: Check to enable continuous sync every 2 minutes.
4. Click **Test server** to check connectivity, network latency, and server version.
5. Click **Save Settings**.

---

## 5. Live Status Indicator & Popover

The top navigation bar displays a live **SyncStatusBadge** with real-time indicators:

| Badge State | Color | Description |
| :--- | :--- | :--- |
| **Online** | Green | Server is reachable; transactions sync automatically. |
| **Offline** | Grey | Server is unreachable; app continues running normally offline. |
| **Syncing…** | Amber (spinning) | Data is actively uploading or downloading. |
| **Sync Error** | Red | The last sync attempt encountered an issue; click badge for error details. |

Clicking the badge opens a quick-status popover showing:
- Server connection status and latency
- Number of pending offline transactions
- Timestamps of the last upload and download
- A **Sync Now** button to trigger an immediate synchronization

---

## 6. Initial Synchronization & Historical Data Backfill

When setting up a new central PostgreSQL database or re-synchronizing after server maintenance, all existing historical records in local SQLite can be uploaded.

### Method 1: Via the Desktop UI
1. Sign in as **ADMIN** and open **General Parameters → Data sync**.
2. Click **Upload all records** in the top action bar or Live Status card.
3. Confirm the confirmation prompt:
   - The app sends all local master tables to `POST /api/sync/bootstrap-master` (ensures foreign keys exist).
   - It iterates through all local `Customer`, `Sale`, `DeliveryOrder`, `StockReceipt`, `StockTransfer`, `StockAdjustment`, and `DocumentBooklet` records, enqueues them into `SyncOutbox`, and pushes them in batches of 50.
   - The screen shows live progress and outbox counts in real time.

### Method 2: Via Command Line
Close the application and run from the repository root:
```bash
npm run sync:backfill
```
This loads your live SQLite database at `%APPDATA%\sales-electron\sales.db`, bootstraps master reference tables, and pushes all transactions to PostgreSQL.

**Idempotency Guarantee**: Both backfill methods are fully idempotent. Running backfill multiple times updates matching records (`ON CONFLICT DO UPDATE`) and will **never create duplicate records**.

---

## 7. Sync Protocol Details

### Upward Push (`POST /api/sync/push`)
- Client loops while local outbox has **PENDING or FAILED** items (failed rows are retried after the cause is fixed).
- Pushes up to 100 items per batch from `SyncOutbox` where `status IN ('PENDING', 'FAILED')`.
- Payload structures include child line items and payments:
  - **Sale**: Header (including `cancelledAt` / `cancelledByUserId` / `cancelReason` when voided), `lines`, `taxes`, and `payments`.
  - **DeliveryOrder**: Header, `details`, and `paymentDetails`.
  - **StockReceipt / StockTransfer / StockAdjustment**: Header, `lines`, and `movements`.
  - **Customer**: Profile, taxpayer identification, tax regime, and customer type.
  - **DocumentBooklet**: Booklet code, serial number ranges, and validation status.
- Executed inside a PostgreSQL database transaction with `ON CONFLICT (id) DO UPDATE`.
- On success, local SQLite rows update to `status = 'SYNCED'`. Synced items older than 7 days are pruned automatically.
- **Schema:** After deploying sale cancellation (SQLite migration `119`), run `npm run server:migrate` so Postgres `sales` has `cancelled_at` / `cancelled_by_user_id` / `cancel_reason` (`ALTER TABLE … IF NOT EXISTS` in `server/src/db/migrate.ts`). Missing columns leave sale pushes in **FAILED**.

### Downward Pull (`GET /api/sync/pull?since=ISO_TIMESTAMP`)
- Queries PostgreSQL for all master data modified since `since`.
- Returned tables are applied atomically in a local SQLite transaction using `ON CONFLICT DO UPDATE`.
- **Note**: When updating reference tables directly in PostgreSQL via SQL, always set `updated_at = NOW()` so client delta queries detect the update:
  ```sql
  UPDATE product_unit_price_schedules
  SET unit_price_ex_tax = '650.00', updated_at = NOW()
  WHERE id = 'sched-01';
  ```

---

## 8. Multi-Terminal Registration & Security

By default, any client with the `API_SECRET_KEY` is authorized as `master-admin`. For production multi-terminal deployments:

1. Insert a device record into PostgreSQL:
   ```sql
   INSERT INTO devices (id, name, sales_point_id, api_key, is_active)
   VALUES ('term-pos-01', 'Cashier 1 - Head Office', 1, 'secure-random-token-01', true);
   ```
2. In that computer's desktop app, set **Device API Token** to `secure-random-token-01` and **Device ID** to `term-pos-01`.
3. If a computer is lost or compromised, deactivate the device in PostgreSQL:
   ```sql
   UPDATE devices SET is_active = false WHERE id = 'term-pos-01';
   ```
   All sync attempts from that terminal will be immediately rejected with HTTP 401 Unauthorized.

---

## 9. Troubleshooting & FAQ

### "Connection failed: fetch failed"
- **Cause**: The Hono server is not running or port 3001 is unreachable.
- **Fix**: Open a terminal, navigate to `server/`, and run `npm run dev` (or start Docker). Verify by visiting `http://localhost:3001/api/health` in a browser.

### "PostgresError: password authentication failed for user 'postgres'"
- **Cause**: The database password in `server/.env` does not match your PostgreSQL installation.
- **Fix**: Update `DATABASE_URL` in `server/.env` with your actual password. Special characters (like `@`) must be URL-encoded (`%40`).

### "Server rejected push batch" or "Unauthorized: Invalid device token"
- **Cause**: The **Device API Token** entered on the Data sync screen does not match `API_SECRET_KEY` in `server/.env` or any active key in the `devices` table.
- **Fix**: Copy the exact token from `server/.env` into the desktop app's **Device API Token** field and click **Save Settings**.

### "Data in PostgreSQL looks different or empty"
- **Cause**: The backfill script was previously run against the generic Electron path rather than the production application database.
- **Fix**: Run `npm run server:reset` to clear any old test data, then run `npm run sync:backfill`. The script explicitly targets `%APPDATA%\sales-electron\sales.db`.

### How to generate a new API Secret Key
In your terminal, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the 64-character output into `server/.env` (`API_SECRET_KEY=...`) and into the desktop app's **Device API Token** field.
