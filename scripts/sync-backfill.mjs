/**
 * CLI script to backfill and synchronize all existing local data to PostgreSQL.
 * Usage: npm run sync:backfill
 */
import { app } from "electron";
import path from "node:path";
import os from "node:os";

const APP_USER_DATA = path.join(
  process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
  "sales-electron",
);

// Must run before ready: otherwise Electron defaults to …/Roaming/Electron/sales.db
app.setPath("userData", APP_USER_DATA);

app.whenReady().then(async () => {
  try {
    const dbPath = path.join(app.getPath("userData"), "sales.db");
    console.log(`Loading SQLite database from: ${dbPath}`);
    console.log("Initializing database connection...");
    const { initDatabase, closeDatabase, getDatabase } = await import(
      "../dist-electron/electron/db/index.js"
    );
    initDatabase();
    const db = getDatabase();

    const { getSyncService } = await import(
      "../dist-electron/electron/sync/syncService.js"
    );
    const { getSyncState, updateSyncState } = await import(
      "../dist-electron/electron/sync/syncOutbox.js"
    );

    // If apiToken is not set in SyncState, fallback to server/.env if available
    const currentState = getSyncState(db);
    if (!currentState.apiToken) {
      try {
        const fs = await import("node:fs");
        const envPath = path.join(process.cwd(), "server", ".env");
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, "utf8");
          const m = envContent.match(/API_SECRET_KEY=([^\r\n]+)/);
          if (m && m[1]) {
            console.log("Setting API token from server/.env for CLI backfill...");
            updateSyncState(db, { apiToken: m[1].trim() });
          }
        }
      } catch {}
    }

    const syncService = getSyncService();
    syncService.init();

    console.log("Starting full backfill and upload to central PostgreSQL server...");
    const result = await syncService.backfillAllData();

    if (result.ok) {
      console.log("\n========================================================");
      console.log(" BACKFILL SUCCESSFUL");
      console.log("========================================================");
      console.log(`Total transactions enqueued and pushed: ${result.enqueuedCount}`);
      if (result.summary) {
        console.log("Transaction summary:");
        for (const [entity, count] of Object.entries(result.summary)) {
          if (count > 0) {
            console.log(`  - ${entity}: ${count}`);
          }
        }
      }
      if (result.masterSummary) {
        console.log("\nMaster tables bootstrapped:");
        for (const [table, count] of Object.entries(result.masterSummary)) {
          if (count > 0) {
            console.log(`  - ${table}: ${count}`);
          }
        }
      }
      console.log("========================================================\n");
    } else {
      console.error("\nBackfill failed:", result.message);
      process.exitCode = 1;
    }

    closeDatabase();
  } catch (err) {
    console.error("Backfill execution error:", err);
    process.exitCode = 1;
  } finally {
    app.quit();
  }
});
