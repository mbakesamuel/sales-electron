# Data synchronization

Sales Management Application operates on an **offline-first** architecture. Each computer saves all operational records to its local database immediately, allowing operators to work without interruptions during internet or power outages. When an internet connection is available, the application automatically synchronizes transactions to a central **PostgreSQL** database.

This section explains how to monitor sync status, configure server settings, and trigger manual synchronization.

---

## The live sync status badge

A status badge is located in the top navigation bar of every screen:

| Badge | Meaning | Action required |
| :--- | :--- | :--- |
| **Online** (green) | The application is connected to the central sync server. Background sync is running. | None. Work proceeds normally. |
| **Offline** (grey) | The sync server is unreachable or the PC has no internet. | None. You can continue creating sales, delivery orders, and stock movements. All data will upload automatically when the network recovers. |
| **Syncing…** (amber, spinning) | Data is actively uploading or downloading. | Wait a few moments for the cycle to complete. |
| **Sync error** (red) | The last sync attempt failed (e.g. invalid server URL or authentication token). | Click the badge or open **Data sync** to view the error message. |

### Quick-status popover

Clicking the sync badge in the top bar opens a popover showing:
- Current network connection and server response time (latency)
- Number of pending offline transactions waiting to be uploaded
- Timestamps of the last upload and download
- A **Sync Now** button to immediately upload pending changes

---

## Data sync settings (ADMIN)

**ADMIN** users can configure server connection parameters under **General Parameters → Data sync**.

### Configuration fields

1. **Hono Central API URL**: The network address of the central synchronization server:
   - For local office networks: e.g. `http://192.168.1.100:3001`
   - For cloud-hosted servers: e.g. `https://sync.yourcompany.com`
   - For local testing: `http://localhost:3001`
2. **Device API Token**: The secret authorization key matching the server's `API_SECRET_KEY` (or the specific key assigned to this terminal).
3. **Terminal / Device identifier**: A distinct name for this computer (e.g. `terminal-cashier-01`, `terminal-warehouse`).
4. **Enable automatic background sync**: When checked (default), the app automatically checks for connectivity and uploads pending transactions every 2 minutes.

After making changes, click **Save Settings**.

---

## Action buttons

### Test server
Tests network connectivity to the central server without uploading transactions. Displays round-trip latency and server version if successful, or an error message if the server cannot be reached.

### Sync Now
Immediately triggers a complete synchronization cycle:
1. Uploads all pending transactions in the local outbox to PostgreSQL.
2. Downloads any updated catalog products, unit prices, tax schedules, user accounts, and company settings from PostgreSQL into SQLite.

### Upload all records (Initial sync & Backfill)
When setting up a new central database or restoring after server maintenance, click **Upload all records**:
1. Confirms with a prompt explaining the backfill process.
2. Bootstraps all local master tables (company settings, locations, products, pricing, users, and permissions) to PostgreSQL.
3. Enqueues all historical sales, delivery orders, stock receipts, transfers, adjustments, customers, and booklets into the outbox.
4. Flushes the queue to PostgreSQL until all historical records are synchronized.

*Note: This operation is safe and idempotent—it updates matching records without creating duplicates.*

---

## The offline transaction outbox

At the bottom of the **Data sync** screen is the **Offline transaction outbox** table:
- Displays all mutations created locally while offline or between sync cycles.
- Shows entity type (Sale, DeliveryOrder, StockReceipt, Customer, etc.), action (UPSERT, UPDATE, DELETE), retry count, and creation time.
- Once successfully uploaded and acknowledged by the server, items are marked `SYNCED` and cleaned up automatically after 7 days.

---

## Two-way data flow summary

| Direction | What is synchronized |
| :--- | :--- |
| **Upward (Terminal ➔ Central PostgreSQL)** | Invoices & sales lines, delivery orders & line items, stock receipts, transfers, adjustments, customers, document booklets. |
| **Downward (Central PostgreSQL ➔ Terminal)** | Product catalog, unit price schedules, customer classifications, tax regimes and rate schedules, payment methods, sales points, storage locations, roles, user accounts, role permissions, company settings. |

---

## Common questions

### What happens if the internet goes down while creating an invoice?
The invoice is saved instantly to your local database. A pending upload task is placed in the outbox. As soon as connectivity is restored, the application uploads the invoice in the background.

### Can two terminals use the same system offline?
Yes. Each terminal maintains its own local SQLite database. When they reconnect, both upload their transactions to PostgreSQL. Sales invoices and delivery orders use unique sequence numbers and identifiers to avoid overwriting each other.

### How do changes made centrally reach the terminals?
Whenever a price schedule, customer definition, or user permission is updated in the central PostgreSQL database, every terminal downloads the changes during its next sync cycle (every 2 minutes or upon clicking **Sync Now**).
