/**
 * Clear stock documents, stock ledger/balances, and sales from sales.db.
 * Keeps delivery orders and all master data.
 *
 * Run (close the Electron app first):
 *   npm run db:clear-stock -- confirm
 *
 * Or:
 *   set CLEAR_STOCK_YES=1&& npm run db:clear-stock   (cmd)
 *   $env:CLEAR_STOCK_YES=1; npm run db:clear-stock   (PowerShell)
 *
 * Note: do not use `--yes` — npm consumes that global flag and never forwards it.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";
import {
  closeDatabase,
  getDatabase,
  initDatabase,
} from "../dist-electron/electron/db/index.js";

const APP_USER_DATA = path.join(
  process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
  "sales-electron",
);

// Must run before ready: otherwise Electron defaults to …/Roaming/Electron/sales.db
app.setPath("userData", APP_USER_DATA);

/** npm eats `--yes`; Electron can swallow unknown flags. Prefer `confirm`. */
function wantsForceClear() {
  if (process.env.CLEAR_STOCK_YES === "1") {
    return true;
  }

  return process.argv.some(
    (arg) =>
      arg === "confirm" ||
      arg === "--confirm" ||
      arg === "--yes" ||
      arg === "-y" ||
      arg === "yes" ||
      arg === "--force",
  );
}

const FORCE = wantsForceClear();

const DELETE_TABLES = [
  "StockMovement",
  "StockBalance",
  "StockReceipt",
  "StockTransfer",
  "StockAdjustment",
  "Sale",
];

const SEQUENCE_TABLES = [
  "StockReceiptSequence",
  "StockTransferSequence",
  "StockAdjustmentSequence",
  "CommercialInvoiceSequence",
];

function printUsageAndExit() {
  console.error(`
This will permanently delete from:
  ${path.join(APP_USER_DATA, "sales.db")}

  - StockMovement, StockBalance
  - StockReceipt (+ lines), StockTransfer (+ lines), StockAdjustment (+ lines)
  - Sale (+ SaleLine, SaleAppliedTax, Payment, VehicleConsignmentNote)
  - and reset stock / commercial invoice sequences to nextNumber = 1

Kept: products, locations, sales points, users, customers, mills,
      delivery orders, budgets, permissions, settings.

Re-run with confirmation (close the Electron app first):
  npm run db:clear-stock -- confirm
`);
  process.exit(1);
}

app.whenReady().then(() => {
  if (!FORCE) {
    printUsageAndExit();
    return;
  }

  const dbPath = path.join(APP_USER_DATA, "sales.db");
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    app.exit(1);
    return;
  }

  try {
    initDatabase();
    const db = getDatabase();

    console.log(`Database: ${dbPath}`);
    db.pragma("foreign_keys = ON");

    const clearAll = db.transaction(() => {
      const deleted = {};

      for (const table of DELETE_TABLES) {
        const result = db.prepare(`DELETE FROM ${table}`).run();
        deleted[table] = result.changes;
      }

      const sequences = {};
      for (const table of SEQUENCE_TABLES) {
        const result = db
          .prepare(
            `UPDATE ${table}
             SET nextNumber = 1,
                 updatedAt = datetime('now')`,
          )
          .run();
        sequences[table] = result.changes;
      }

      return { deleted, sequences };
    });

    const { deleted, sequences } = clearAll();

    console.log("Cleared stock + sales:");
    for (const [table, count] of Object.entries(deleted)) {
      console.log(`  ${table}: ${count} row(s) deleted`);
    }
    console.log("Sequences reset (nextNumber = 1):");
    for (const [table, count] of Object.entries(sequences)) {
      console.log(`  ${table}: ${count} row(s) updated`);
    }
    console.log("Done.");

    closeDatabase();
    app.quit();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Failed to clear stock/sales (close the Electron app first if the DB is locked): ${message}`,
    );
    try {
      closeDatabase();
    } catch {
      // ignore
    }
    app.exit(1);
  }
});
