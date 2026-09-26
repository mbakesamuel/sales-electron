import type postgres from "postgres";

/** Ops tables only — mirrors SQLite clearOperationalData scope (keeps masters). */
export const OPERATIONAL_TABLES = [
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
] as const;

export type ClearOperationalTablesResult = {
  tables: string[];
};

/**
 * Truncate stock / sales / delivery-order operational tables on Postgres.
 * Keeps masters (products, customers, users, settings, devices, etc.).
 */
export async function clearOperationalTables(
  sql: postgres.Sql,
): Promise<ClearOperationalTablesResult> {
  const tables = [...OPERATIONAL_TABLES];
  const quoted = tables.map((t) => `"${t}"`).join(", ");

  await sql.unsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`,
  );

  return { tables };
}
