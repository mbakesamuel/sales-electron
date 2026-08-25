import Database from "better-sqlite3";
import os from "node:os";
import path from "node:path";

const dbPath = path.join(
  process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
  "sales-electron",
  "sales.db",
);

const AS_OF = "2026-08-02";

const db = new Database(dbPath, { readonly: true });

function monthStartDate(year, calendarMonth) {
  const m = String(calendarMonth).padStart(2, "0");
  return `${year}-${m}-01`;
}

function monthEndDate(year, calendarMonth) {
  const last = new Date(Date.UTC(year, calendarMonth, 0)).getUTCDate();
  const m = String(calendarMonth).padStart(2, "0");
  return `${year}-${m}-${String(last).padStart(2, "0")}`;
}

console.log("DB:", dbPath);
console.log("As-of:", AS_OF);

console.log("\n=== Open financial month ===");
const openRows = db
  .prepare(
    `SELECT fm.financialYear, fm.calendarMonth, fm.name AS monthName, fm.status
     FROM FinancialMonth fm
     WHERE fm.status = 'OPEN'`,
  )
  .all();
for (const row of openRows) {
  const start = monthStartDate(row.financialYear, row.calendarMonth);
  const end = monthEndDate(row.financialYear, row.calendarMonth);
  const inRange = AS_OF >= start && AS_OF <= end;
  console.log({
    ...row,
    start,
    end,
    august2InOpenMonth: inRange,
  });
}
if (openRows.length === 0) {
  console.log("(none open)");
}

console.log("\n=== Idenau collection point(s) ===");
const sps = db
  .prepare(
    `SELECT id, name, COALESCE(attachedToMill,0) AS attachedToMill
     FROM SalesPoint
     WHERE name LIKE '%Idenau%' COLLATE NOCASE`,
  )
  .all();
console.log(sps.length ? sps : "(no match)");

console.log("\n=== Products matching 3x5 ===");
const products = db
  .prepare(
    `SELECT p.productId, p.productName, p.uom,
            COALESCE(pc.isBottled,0) AS isBottled, pc.productCode
     FROM Product p
     LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
     WHERE REPLACE(UPPER(p.productName), ' ', '') LIKE '%3X5%'
        OR UPPER(p.productName) LIKE '%3 X 5%'
        OR UPPER(p.productName) LIKE '%5L%CTN%'`,
  )
  .all();
console.log(products.length ? products : "(no match — listing bottled sample)");
if (!products.length) {
  console.log(
    db
      .prepare(
        `SELECT p.productId, p.productName, COALESCE(pc.isBottled,0) AS isBottled
         FROM Product p
         LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
         WHERE COALESCE(pc.isBottled,0)=1
         ORDER BY p.productName
         LIMIT 40`,
      )
      .all(),
  );
}

const productIds = products.map((p) => p.productId);
const spIds = sps.map((s) => s.id);

if (!spIds.length || !productIds.length) {
  console.log("\nCannot continue without Idenau + 3x5 product match.");
  db.close();
  process.exit(0);
}

console.log("\n=== Storage locations at Idenau ===");
const locs = db
  .prepare(
    `SELECT sl.id, l.locationName AS name, sl.isDefault,
            COALESCE(sl.isSalesTank,0) AS isSalesTank, sl.salesPointId
     FROM StorageLocation sl
     JOIN Location l ON l.id = sl.locationId
     WHERE sl.salesPointId IN (${spIds.map(() => "?").join(",")})
     ORDER BY l.locationName`,
  )
  .all(...spIds);
console.log(locs);

console.log("\n=== Live StockBalance (Idenau + 3x5) ===");
const live = db
  .prepare(
    `SELECT sb.salesPointId, sp.name AS salesPointName,
            sb.storageLocationId, COALESCE(l.locationName,'—') AS locationName,
            sb.productId, p.productName, sb.condition, sb.qty, sb.updatedAt
     FROM StockBalance sb
     JOIN SalesPoint sp ON sp.id = sb.salesPointId
     JOIN Product p ON p.productId = sb.productId
     LEFT JOIN StorageLocation sl ON sl.id = sb.storageLocationId
     LEFT JOIN Location l ON l.id = sl.locationId
     WHERE sb.salesPointId IN (${spIds.map(() => "?").join(",")})
       AND sb.productId IN (${productIds.map(() => "?").join(",")})
     ORDER BY p.productName, locationName, sb.condition`,
  )
  .all(...spIds, ...productIds);
console.log(live.length ? live : "(no live balance rows)");

console.log("\n=== Sellable balance AS OF", AS_OF, "(from movements) ===");
const asOfBalances = db
  .prepare(
    `SELECT sm.salesPointId, sp.name AS salesPointName,
            sm.storageLocationId, COALESCE(l.locationName,'—') AS locationName,
            sm.productId, p.productName, sm.condition,
            sm.kind, sm.qty, sm.occurredAt, sm.sourceKind, sm.sourceId
     FROM StockMovement sm
     JOIN SalesPoint sp ON sp.id = sm.salesPointId
     JOIN Product p ON p.productId = sm.productId
     LEFT JOIN StorageLocation sl ON sl.id = sm.storageLocationId
     LEFT JOIN Location l ON l.id = sl.locationId
     WHERE sm.salesPointId IN (${spIds.map(() => "?").join(",")})
       AND sm.productId IN (${productIds.map(() => "?").join(",")})
       AND substr(sm.occurredAt,1,10) <= ?
     ORDER BY p.productName, locationName, sm.occurredAt, sm.createdAt`,
  )
  .all(...spIds, ...productIds, AS_OF);

const signed = (kind, qty) => {
  const n = Number.parseFloat(qty);
  if (!Number.isFinite(n)) return 0;
  if (kind === "TRANSFER_OUT" || kind === "SALE") return -Math.abs(n);
  if (kind === "SALE_REVERSAL") return Math.abs(n);
  if (kind === "ADJUSTMENT") return n; // stored signed
  return Math.abs(n); // RECEIPT, TRANSFER_IN
};

const totals = new Map();
for (const row of asOfBalances) {
  const key = `${row.productId}|${row.storageLocationId}|${row.condition}`;
  const prev = totals.get(key) ?? {
    salesPointId: row.salesPointId,
    salesPointName: row.salesPointName,
    storageLocationId: row.storageLocationId,
    locationName: row.locationName,
    productId: row.productId,
    productName: row.productName,
    condition: row.condition,
    qty: 0,
  };
  prev.qty += signed(row.kind, row.qty);
  totals.set(key, prev);
}

const asOfRows = [...totals.values()].filter((r) => Math.abs(r.qty) > 0.000001);
console.log(
  asOfRows.length
    ? asOfRows.map((r) => ({ ...r, qty: Number(r.qty.toFixed(3)) }))
    : "(zero / no movements through as-of date)",
);

console.log("\n=== All movements for Idenau + 3x5 (chronological) ===");
const allMoves = db
  .prepare(
    `SELECT substr(sm.occurredAt,1,10) AS day, sm.kind, sm.condition, sm.qty,
            COALESCE(l.locationName,'—') AS locationName, p.productName,
            sm.sourceKind, sm.sourceId, sm.occurredAt
     FROM StockMovement sm
     JOIN Product p ON p.productId = sm.productId
     LEFT JOIN StorageLocation sl ON sl.id = sm.storageLocationId
     LEFT JOIN Location l ON l.id = sl.locationId
     WHERE sm.salesPointId IN (${spIds.map(() => "?").join(",")})
       AND sm.productId IN (${productIds.map(() => "?").join(",")})
     ORDER BY sm.occurredAt, sm.createdAt`,
  )
  .all(...spIds, ...productIds);
console.log(`count=${allMoves.length}`);
for (const m of allMoves) {
  console.log(
    `${m.day} ${m.kind.padEnd(14)} ${m.condition.padEnd(10)} qty=${m.qty} @ ${m.locationName} [${m.sourceKind}]`,
  );
}

console.log("\n=== Existing transfers involving Idenau (Aug 2026 window) ===");
const transfers = db
  .prepare(
    `SELECT t.transferNo, t.status, t.dispatchedAt,
            f.name AS fromSp, d.name AS toSp,
            t.fromSalesPointId, t.toSalesPointId
     FROM StockTransfer t
     JOIN SalesPoint f ON f.id = t.fromSalesPointId
     JOIN SalesPoint d ON d.id = t.toSalesPointId
     WHERE (t.fromSalesPointId IN (${spIds.map(() => "?").join(",")})
         OR t.toSalesPointId IN (${spIds.map(() => "?").join(",")}))
       AND substr(t.dispatchedAt,1,10) BETWEEN '2026-08-01' AND '2026-08-31'
     ORDER BY t.dispatchedAt`,
  )
  .all(...spIds, ...spIds);
console.log(transfers.length ? transfers : "(none in Aug 2026)");

console.log("\n=== Transfer lines for those docs with 3x5 ===");
if (transfers.length) {
  const lines = db
    .prepare(
      `SELECT t.transferNo, t.status, p.productName, l.qty,
              fl.locationName AS fromLoc, tl.locationName AS toLoc
       FROM StockTransfer t
       JOIN StockTransferLine l ON l.transferId = t.id
       JOIN Product p ON p.productId = l.productId
       LEFT JOIN StorageLocation fsl ON fsl.id = l.fromStorageLocationId
       LEFT JOIN Location fl ON fl.id = fsl.locationId
       LEFT JOIN StorageLocation tsl ON tsl.id = l.toStorageLocationId
       LEFT JOIN Location tl ON tl.id = tsl.locationId
       WHERE (t.fromSalesPointId IN (${spIds.map(() => "?").join(",")})
           OR t.toSalesPointId IN (${spIds.map(() => "?").join(",")}))
         AND substr(t.dispatchedAt,1,10) BETWEEN '2026-08-01' AND '2026-08-31'
         AND l.productId IN (${productIds.map(() => "?").join(",")})
       ORDER BY t.transferNo`,
    )
    .all(...spIds, ...spIds, ...productIds);
  console.log(lines.length ? lines : "(no 3x5 lines on Aug transfers)");
}

db.close();
console.log("\nDone.");
process.exit(0);