import postgres from "postgres";
import { formatDbTargetLog, loadDbConfig } from "./config.js";
import { clearOperationalTables } from "./clearOperationalData.js";

function wantsConfirm(): boolean {
  if (process.env.CLEAR_OPS_YES === "1") {
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

function printUsageAndExit(): never {
  console.error(`
This permanently deletes operational data from the sync Postgres database
(selected by DB_TARGET): sales, delivery orders, stock receipts/transfers/
adjustments/movements. Masters (products, customers, users, settings) are kept.

Re-run with confirmation:
  npm run db:clear-ops -- confirm
  # or: set CLEAR_OPS_YES=1

For DB_TARGET=prod also set:
  CONFIRM_PROD_CLEAR_OPS=1
`);
  process.exit(1);
}

async function main() {
  if (!wantsConfirm()) {
    printUsageAndExit();
  }

  const config = loadDbConfig();

  if (config.target === "prod" && process.env.CONFIRM_PROD_CLEAR_OPS !== "1") {
    console.error(
      "Refusing to clear operational data on production. Set DB_TARGET=dev, or set CONFIRM_PROD_CLEAR_OPS=1 to proceed.",
    );
    process.exit(1);
  }

  console.log(formatDbTargetLog(config));

  const sql = postgres(config.databaseUrl, { max: 1, connect_timeout: 10 });

  try {
    console.log("Clearing operational tables on PostgreSQL...");
    const { tables } = await clearOperationalTables(sql);
    console.log("Cleared tables:");
    for (const table of tables) {
      console.log(`  ${table}`);
    }
    console.log("Done.");
  } catch (err) {
    console.error("Clear operational data failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

void main();
