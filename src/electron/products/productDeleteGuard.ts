import type Database from "better-sqlite3";

interface CountedReference {
  singular: string;
  plural: string;
  sql: string;
}

const PRODUCT_REFERENCE_CHECKS: CountedReference[] = [
  {
    singular: "price schedule entry",
    plural: "price schedule entries",
    sql: "SELECT COUNT(*) AS count FROM ProductUnitPriceSchedule WHERE productId = ?",
  },
  {
    singular: "sales invoice line",
    plural: "sales invoice lines",
    sql: "SELECT COUNT(*) AS count FROM SaleLine WHERE productId = ?",
  },
  {
    singular: "delivery order line",
    plural: "delivery order lines",
    sql: "SELECT COUNT(*) AS count FROM DeliveryOrderDetails WHERE productId = ?",
  },
  {
    singular: "delivery transfer line",
    plural: "delivery transfer lines",
    sql: "SELECT COUNT(*) AS count FROM DeliveryOrderTransferLine WHERE productId = ?",
  },
  {
    singular: "stock receipt line",
    plural: "stock receipt lines",
    sql: "SELECT COUNT(*) AS count FROM StockReceiptLine WHERE productId = ?",
  },
  {
    singular: "stock transfer line",
    plural: "stock transfer lines",
    sql: "SELECT COUNT(*) AS count FROM StockTransferLine WHERE productId = ?",
  },
  {
    singular: "stock adjustment line",
    plural: "stock adjustment lines",
    sql: "SELECT COUNT(*) AS count FROM StockAdjustmentLine WHERE productId = ?",
  },
  {
    singular: "stock movement record",
    plural: "stock movement records",
    sql: "SELECT COUNT(*) AS count FROM StockMovement WHERE productId = ?",
  },
];

function productHasStockPoolColumn(db: Database.Database): boolean {
  const columns = db
    .prepare("PRAGMA table_info(Product)")
    .all() as Array<{ name: string }>;
  return columns.some((column) => column.name === "stockPoolProductId");
}

function formatCountLine(count: number, singular: string, plural: string): string {
  const label = count === 1 ? singular : plural;
  return `• ${count} ${label}`;
}

export function assertProductCanBeDeleted(
  db: Database.Database,
  productId: number,
): void {
  const product = db
    .prepare("SELECT productName FROM Product WHERE productId = ?")
    .get(productId) as { productName: string } | undefined;

  if (!product) {
    throw new Error("Product was not found");
  }

  const lines: string[] = [];

  if (productHasStockPoolColumn(db)) {
    const members = db
      .prepare(
        `SELECT productName
         FROM Product
         WHERE stockPoolProductId = ?
         ORDER BY productName`,
      )
      .all(productId) as Array<{ productName: string }>;

    if (members.length > 0) {
      const names = members.map((member) => member.productName).join(", ");
      lines.push(`• Stock intake pool for: ${names}`);
    }
  }

  for (const check of PRODUCT_REFERENCE_CHECKS) {
    const row = db.prepare(check.sql).get(productId) as { count: number };
    const count = row?.count ?? 0;
    if (count > 0) {
      lines.push(formatCountLine(count, check.singular, check.plural));
    }
  }

  if (lines.length === 0) {
    return;
  }

  throw new Error(
    `Cannot delete product "${product.productName}" because it is still in use:\n${lines.join("\n")}\n\nRemove or reassign those records before deleting this product.`,
  );
}
