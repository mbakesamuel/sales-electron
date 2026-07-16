/**
 * Verify TaxRateSchedule as-of resolution.
 * Run: npm run verify:tax-schema
 */
import { app } from "electron";
import { closeDatabase, getDatabase, initDatabase } from "../dist-electron/electron/db/index.js";
import { resolveCustomerTaxProfile } from "../dist-electron/shared/taxRules.js";
import { loadTaxRatesAsOf } from "../dist-electron/electron/tax/resolveRates.js";

app.whenReady().then(() => {
  initDatabase();
  const db = getDatabase();

  const table = db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'TaxRateSchedule' LIMIT 1`,
    )
    .get();
  if (!table) {
    console.error("FAIL: TaxRateSchedule missing");
    closeDatabase();
    app.exit(1);
    return;
  }
  console.log("PASS: TaxRateSchedule exists");

  const kinds = db
    .prepare(`SELECT DISTINCT rateKind FROM TaxRateSchedule ORDER BY rateKind`)
    .all()
    .map((row) => row.rateKind);
  const expected = ["SALES_ACTUAL", "SALES_NO_TAXPAYER", "SALES_SIMPLIFIED", "VAT"];
  for (const kind of expected) {
    if (!kinds.includes(kind)) {
      console.error(`FAIL: missing rateKind ${kind}`);
      closeDatabase();
      app.exit(1);
      return;
    }
  }
  console.log("PASS: all rate kinds seeded", kinds);

  // Insert a future/past rate change for VAT and verify as-of
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  db.prepare(
    `INSERT OR REPLACE INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom, createdAt, updatedAt)
     VALUES ('tax-rate-vat-test-old', 'VAT', '0.15', '2000-01-01', ?, ?)`,
  ).run(now, now);
  db.prepare(
    `INSERT OR REPLACE INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom, createdAt, updatedAt)
     VALUES ('tax-rate-vat-test-new', 'VAT', '0.20', '2020-01-01', ?, ?)`,
  ).run(now, now);

  const before = loadTaxRatesAsOf("2010-06-01");
  const after = loadTaxRatesAsOf("2021-06-01");

  if (Math.abs(before.vatRate - 0.15) > 1e-9) {
    console.error("FAIL: asOf 2010 should use 15% VAT", before.vatRate);
    closeDatabase();
    app.exit(1);
    return;
  }
  console.log("PASS: asOf 2010 → VAT 15%");

  if (Math.abs(after.vatRate - 0.2) > 1e-9) {
    console.error("FAIL: asOf 2021 should use 20% VAT", after.vatRate);
    closeDatabase();
    app.exit(1);
    return;
  }
  console.log("PASS: asOf 2021 → VAT 20%");

  const profile = resolveCustomerTaxProfile({
    residency: "LOCAL",
    taxRegimeKind: "REAL",
    taxpayerId: "X",
    rates: after,
  });
  if (Math.abs(profile.vatRate - 0.2) > 1e-9 || Math.abs(profile.salesTaxRate - after.salesActual) > 1e-9) {
    console.error("FAIL: profile with rates bag", profile);
    closeDatabase();
    app.exit(1);
    return;
  }
  console.log("PASS: profile uses schedule rates bag");

  // Cleanup test rows (leave seeds intact)
  db.prepare(`DELETE FROM TaxRateSchedule WHERE id LIKE 'tax-rate-vat-test-%'`).run();

  closeDatabase();
  app.quit();
});
