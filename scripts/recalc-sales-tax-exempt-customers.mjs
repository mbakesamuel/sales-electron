/**
 * Zero sales tax on existing DO lines and sales for customer types marked exempt.
 * Run: npm run recalc:sales-tax-exempt
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";
import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDbPath() {
  return path.join(
    process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
    "sales-electron",
    "sales.db",
  );
}

function getMigrationsDir() {
  return path.join(__dirname, "../dist-electron/electron/db/migrations");
}

function runPendingMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    database
      .prepare("SELECT name FROM schema_migrations")
      .all()
      .map((row) => row.name),
  );

  for (const fileName of readdirSync(getMigrationsDir())
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    if (applied.has(fileName)) {
      continue;
    }
    const sql = readFileSync(path.join(getMigrationsDir(), fileName), "utf8");
    database.exec(sql);
    database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
  }
}

function roundMoney2(value) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function parseAmount(value) {
  const parsed = Number.parseFloat(String(value ?? "0").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

app.whenReady().then(() => {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    app.exit(1);
    return;
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runPendingMigrations(db);

  const doLinesBefore = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM DeliveryOrderDetails dod
       INNER JOIN DeliveryOrder do ON do.id = dod.deliveryOrderId
       INNER JOIN Customer c ON c.id = do.customerId
       INNER JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
       WHERE ct.exemptFromSalesTax = 1
         AND CAST(COALESCE(dod.otherTaxAmount, '0') AS REAL) > 0`,
    )
    .get().count;

  const salesTaxRowsBefore = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM SaleAppliedTax sat
       INNER JOIN Sale s ON s.id = sat.saleId
       INNER JOIN Customer c ON c.id = s.customerId
       INNER JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
       WHERE ct.exemptFromSalesTax = 1
         AND sat.codeSnapshot = 'SALES_TAX'`,
    )
    .get().count;

  console.log(`DO detail lines with sales tax (exempt types): ${doLinesBefore}`);
  console.log(`SaleAppliedTax SALES_TAX rows (exempt types): ${salesTaxRowsBefore}`);

  const paymentWarnings = [];

  const tx = db.transaction(() => {
    const doLines = db
      .prepare(
        `SELECT dod.id, dod.lineSubtotalExTax, dod.vatAmount
         FROM DeliveryOrderDetails dod
         INNER JOIN DeliveryOrder do ON do.id = dod.deliveryOrderId
         INNER JOIN Customer c ON c.id = do.customerId
         INNER JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
         WHERE ct.exemptFromSalesTax = 1
           AND CAST(COALESCE(dod.otherTaxAmount, '0') AS REAL) > 0`,
      )
      .all();

    const updateDoLine = db.prepare(
      `UPDATE DeliveryOrderDetails
       SET otherTaxAmount = '0.00', otherTaxLabel = NULL, amount = ?
       WHERE id = ?`,
    );

    for (const line of doLines) {
      const amount = roundMoney2(
        parseAmount(line.lineSubtotalExTax) + parseAmount(line.vatAmount),
      );
      updateDoLine.run(amount, line.id);
    }

    const sales = db
      .prepare(
        `SELECT s.id, s.invoiceNo, s.netAmount, s.vatAmount, s.grossAmount
         FROM Sale s
         INNER JOIN Customer c ON c.id = s.customerId
         INNER JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
         WHERE ct.exemptFromSalesTax = 1
           AND EXISTS (
             SELECT 1 FROM SaleAppliedTax sat
             WHERE sat.saleId = s.id AND sat.codeSnapshot = 'SALES_TAX'
           )`,
      )
      .all();

    const deleteSalesTax = db.prepare(
      `DELETE FROM SaleAppliedTax
       WHERE saleId = ? AND codeSnapshot = 'SALES_TAX'`,
    );
    const updateSale = db.prepare(
      `UPDATE Sale SET grossAmount = ?, updatedAt = datetime('now') WHERE id = ?`,
    );
    const updateSaleLine = db.prepare(
      `UPDATE SaleLine
       SET lineGross = ROUND(CAST(lineNet AS REAL) + CAST(lineVat AS REAL))
       WHERE saleId = ?`,
    );
    const paymentTotal = db.prepare(
      `SELECT COALESCE(SUM(CAST(amount AS REAL)), 0) AS total
       FROM Payment WHERE saleId = ?`,
    );

    for (const sale of sales) {
      const net = parseAmount(sale.netAmount);
      const vat = parseAmount(sale.vatAmount);
      const newGross = String(Math.round(net + vat));
      deleteSalesTax.run(sale.id);
      updateSale.run(newGross, sale.id);
      updateSaleLine.run(sale.id);

      const paid = paymentTotal.get(sale.id).total;
      if (Math.round(paid) !== Math.round(parseAmount(newGross))) {
        paymentWarnings.push(
          `${sale.invoiceNo}: paid ${Math.round(paid)} vs new gross ${Math.round(parseAmount(newGross))}`,
        );
      }
    }
  });

  tx();

  const doLinesAfter = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM DeliveryOrderDetails dod
       INNER JOIN DeliveryOrder do ON do.id = dod.deliveryOrderId
       INNER JOIN Customer c ON c.id = do.customerId
       INNER JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
       WHERE ct.exemptFromSalesTax = 1
         AND CAST(COALESCE(dod.otherTaxAmount, '0') AS REAL) > 0`,
    )
    .get().count;

  const salesTaxRowsAfter = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM SaleAppliedTax sat
       INNER JOIN Sale s ON s.id = sat.saleId
       INNER JOIN Customer c ON c.id = s.customerId
       INNER JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
       WHERE ct.exemptFromSalesTax = 1
         AND sat.codeSnapshot = 'SALES_TAX'`,
    )
    .get().count;

  console.log(`Updated DO detail lines: ${doLinesBefore - doLinesAfter} (remaining with tax: ${doLinesAfter})`);
  console.log(`Removed SaleAppliedTax rows: ${salesTaxRowsBefore - salesTaxRowsAfter}`);

  if (paymentWarnings.length > 0) {
    console.warn("\nPayment total mismatches (review manually):");
    for (const warning of paymentWarnings) {
      console.warn(`  - ${warning}`);
    }
  }

  db.close();
  app.quit();
});
