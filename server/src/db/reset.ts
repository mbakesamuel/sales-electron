import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/sales_central";

const sql = postgres(databaseUrl, { max: 1 });

async function resetDatabase() {
  console.log("Connecting to PostgreSQL to reset tables...");

  const tables = [
    "sale_applied_taxes",
    "sale_lines",
    "payments",
    "sales",
    "delivery_order_payment_details",
    "delivery_order_details",
    "delivery_orders",
    "stock_receipt_lines",
    "stock_receipts",
    "stock_transfer_lines",
    "stock_transfers",
    "stock_adjustment_lines",
    "stock_adjustments",
    "stock_movements",
    "document_booklets",
    "customers",
    "product_unit_price_schedules",
    "products",
    "product_cats",
    "customer_type_definitions",
    "tax_rate_schedules",
    "tax_regimes",
    "payment_method_definitions",
    "storage_locations",
    "locations",
    "commercial_services",
    "sales_points",
    "role_action_permissions",
    "role_route_permissions",
    "users",
    "roles",
    "company_settings",
  ];

  try {
    for (const table of tables) {
      try {
        await sql.unsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      } catch (tableErr: unknown) {
        // In case a table does not exist yet
        console.warn(`Could not truncate "${table}":`, tableErr instanceof Error ? tableErr.message : String(tableErr));
      }
    }
    console.log("All application tables in PostgreSQL have been cleanly truncated!");
  } catch (err) {
    console.error("Reset failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

void resetDatabase();
