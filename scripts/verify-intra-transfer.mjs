/**
 * Verify intra–sales point location transfers.
 * Run: npm run verify:intra-transfer
 */

import { randomUUID } from "node:crypto";
import { app } from "electron";
import { closeDatabase, getDatabase, initDatabase } from "../dist-electron/electron/db/index.js";
import { login } from "../dist-electron/electron/auth/session.js";
import { applyMovement } from "../dist-electron/electron/stock/post.js";
import {
  dispatchTransfer,
  postInternalTransfer,
  saveTransfer,
} from "../dist-electron/electron/stock/service.js";

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function balanceQty(db, salesPointId, productId, storageLocationId) {
  const row = db
    .prepare(
      `SELECT qty FROM StockBalance
       WHERE salesPointId = ? AND productId = ? AND storageLocationId = ? AND condition = 'SELLABLE'`,
    )
    .get(salesPointId, productId, storageLocationId);
  return row ? Number.parseFloat(String(row.qty)) : 0;
}

function spTotalQty(db, salesPointId, productId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(CAST(qty AS REAL)), 0) AS total
       FROM StockBalance
       WHERE salesPointId = ? AND productId = ? AND condition = 'SELLABLE'`,
    )
    .get(salesPointId, productId);
  return Number.parseFloat(String(row.total));
}

function ensureSecondLocation(db, salesPointId) {
  const locations = db
    .prepare(
      `SELECT sl.id, l.locationName
       FROM StorageLocation sl
       JOIN Location l ON l.id = sl.locationId
       WHERE sl.salesPointId = ?
       ORDER BY sl.id ASC`,
    )
    .all(salesPointId);

  if (locations.length >= 2) {
    return {
      fromLocationId: locations[0].id,
      toLocationId: locations[1].id,
    };
  }

  db.prepare(`INSERT INTO Location (locationName) VALUES (?)`).run("Verify Tank B");
  const locationId = db
    .prepare(`SELECT id FROM Location WHERE locationName = 'Verify Tank B' LIMIT 1`)
    .get().id;

  const insert = db.prepare(
    `INSERT INTO StorageLocation (salesPointId, locationId, isDefault)
     VALUES (?, ?, 0)`,
  );
  insert.run(salesPointId, locationId);
  const toLocationId = db
    .prepare(
      `SELECT id FROM StorageLocation
       WHERE salesPointId = ? AND locationId = ?
       LIMIT 1`,
    )
    .get(salesPointId, locationId).id;

  return {
    fromLocationId: locations[0].id,
    toLocationId,
  };
}

app.whenReady().then(() => {
  initDatabase();
  const db = getDatabase();

  const loginResult = login("admin", "admin123");
  assertOk(loginResult.user, loginResult.error ?? "Login failed.");
  const userId = loginResult.user.id;

  const salesPointId = 1;
  const productId = 1;
  const moveQty = "25.000";
  const { fromLocationId, toLocationId } = ensureSecondLocation(db, salesPointId);

  applyMovement(db, {
    salesPointId,
    productId,
    storageLocationId: fromLocationId,
    qty: "100.000",
    kind: "RECEIPT",
    occurredAt: "2026-07-20T12:00:00.000Z",
    userId,
    sourceKind: "RECEIPT",
    sourceId: randomUUID(),
  });

  const beforeFrom = balanceQty(db, salesPointId, productId, fromLocationId);
  const beforeTo = balanceQty(db, salesPointId, productId, toLocationId);
  const beforeTotal = spTotalQty(db, salesPointId, productId);
  assertOk(beforeFrom >= 25, `Expected at least 25 at source, got ${beforeFrom}`);

  const draft = saveTransfer({
    userId,
    fromSalesPointId: salesPointId,
    toSalesPointId: salesPointId,
    dispatchedAt: "2026-07-20",
    notes: "verify intra transfer",
    lines: [
      {
        productId,
        qty: moveQty,
        fromStorageLocationId: fromLocationId,
        toStorageLocationId: toLocationId,
      },
    ],
  });
  assertOk(draft.ok, draft.error ?? "saveTransfer failed");
  console.log("draftOk", draft.documentNo);

  const dispatchBlocked = dispatchTransfer(userId, draft.id);
  assertOk(!dispatchBlocked.ok, "Expected dispatch to be blocked for intra transfer.");
  assertOk(
    dispatchBlocked.error?.includes("Post"),
    `Unexpected dispatch error: ${dispatchBlocked.error}`,
  );
  console.log("dispatchBlockedOk", dispatchBlocked.error);

  const posted = postInternalTransfer(userId, draft.id);
  assertOk(posted.ok, posted.error ?? "postInternalTransfer failed");
  console.log("postOk");

  const afterFrom = balanceQty(db, salesPointId, productId, fromLocationId);
  const afterTo = balanceQty(db, salesPointId, productId, toLocationId);
  const afterTotal = spTotalQty(db, salesPointId, productId);

  assertOk(
    Math.abs(afterFrom - (beforeFrom - 25)) < 0.001,
    `Source balance expected ${beforeFrom - 25}, got ${afterFrom}`,
  );
  assertOk(
    Math.abs(afterTo - (beforeTo + 25)) < 0.001,
    `Destination balance expected ${beforeTo + 25}, got ${afterTo}`,
  );
  assertOk(
    Math.abs(afterTotal - beforeTotal) < 0.001,
    `Sales point total changed: before ${beforeTotal}, after ${afterTotal}`,
  );
  console.log("balancesOk", { beforeFrom, afterFrom, beforeTo, afterTo, beforeTotal, afterTotal });

  const row = db
    .prepare(`SELECT status FROM StockTransfer WHERE id = ?`)
    .get(draft.id);
  assertOk(row?.status === "POSTED", `Expected POSTED status, got ${row?.status}`);
  console.log("statusOk", row.status);

  console.log("verify-intra-transfer: all checks passed");
  closeDatabase();
  app.quit();
});
