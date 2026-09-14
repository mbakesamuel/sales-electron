/**
 * Smoke-test: initDatabase against an empty userData dir (full migration chain).
 * Usage: npm run transpile:electron && npx electron scripts/verify-fresh-db-init.mjs
 */
import { app } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sales-electron-fresh-db-"));
app.setPath("userData", tempRoot);

app
  .whenReady()
  .then(async () => {
    const { initDatabase, closeDatabase } = await import(
      "../dist-electron/electron/db/index.js"
    );
    const db = initDatabase();
    const migrationCount = db
      .prepare("SELECT COUNT(*) AS c FROM schema_migrations")
      .get().c;
    const roleCount = db.prepare("SELECT COUNT(*) AS c FROM Role").get().c;
    const admin = db
      .prepare("SELECT id, role FROM User WHERE lower(username) = 'admin'")
      .get();
    const jnr = db
      .prepare("SELECT id FROM Role WHERE id = 'JNR_SALES_SUP'")
      .get();
    const fk = db.prepare("PRAGMA foreign_key_check").all();

    const syncOutboxExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='SyncOutbox'")
      .get();
    const syncStateExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='SyncState'")
      .get();
    const saleCols = db.prepare("PRAGMA table_info(Sale)").all();
    const hasCancelledAt = saleCols.some((col) => col.name === "cancelledAt");
    const cancelPerm = db
      .prepare(
        "SELECT role, allowed FROM RoleActionPermission WHERE actionKey = 'cancel_validated_sales'",
      )
      .all();

    console.log("Fresh DB init OK");
    console.log(`  userData: ${tempRoot}`);
    console.log(`  migrations: ${migrationCount}`);
    console.log(`  roles: ${roleCount}`);
    console.log(`  admin: ${admin ? `${admin.id} (${admin.role})` : "missing"}`);
    console.log(`  JNR_SALES_SUP: ${jnr ? "present" : "missing"}`);
    console.log(`  SyncOutbox: ${syncOutboxExists ? "present" : "missing"}`);
    console.log(`  SyncState: ${syncStateExists ? "present" : "missing"}`);
    console.log(`  Sale.cancelledAt: ${hasCancelledAt ? "present" : "missing"}`);
    console.log(`  cancel_validated_sales permissions: ${JSON.stringify(cancelPerm)}`);
    console.log(
      `  foreign_key_check: ${fk.length === 0 ? "clean" : JSON.stringify(fk)}`,
    );

    closeDatabase();
    const ok = Boolean(admin && jnr && fk.length === 0 && syncOutboxExists && syncStateExists);
    app.exit(ok ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fresh DB init FAILED:", error);
    app.exit(1);
  });
