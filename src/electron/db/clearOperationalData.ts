import type Database from "better-sqlite3";

/** Parent tables only; child rows cascade where FKs allow. Order is FK-safe. */
const DELETE_TABLES = [
  "StockMovement",
  "StockBalance",
  "StockReceipt",
  "StockTransfer",
  "StockAdjustment",
  "DeliveryOrderTransfer",
  "Sale",
  "DeliveryOrder",
] as const;

const SEQUENCE_TABLES = [
  "StockReceiptSequence",
  "StockTransferSequence",
  "StockAdjustmentSequence",
  "CommercialInvoiceSequence",
  "DeliveryOrderSequence",
  "VehicleConsignmentNoteSequence",
] as const;

export type ClearOperationalDataResult = {
  deleted: Record<string, number>;
  sequences: Record<string, number>;
};

/**
 * Wipe stock / sales / VCN / delivery-order operational data.
 * Keeps masters (products, customers, users, budgets, permissions, settings).
 * Caller should enable foreign_keys before invoking.
 */
export function clearOperationalData(
  db: Database.Database,
): ClearOperationalDataResult {
  const run = db.transaction(() => {
    const deleted: Record<string, number> = {};

    for (const table of DELETE_TABLES) {
      if (table === "DeliveryOrder") {
        db.prepare(
          `UPDATE DeliveryOrder SET transferredFromDeliveryOrderId = NULL`,
        ).run();
      }
      const result = db.prepare(`DELETE FROM ${table}`).run();
      deleted[table] = result.changes;
    }

    const sequences: Record<string, number> = {};
    for (const table of SEQUENCE_TABLES) {
      const result = db
        .prepare(
          `UPDATE ${table}
           SET nextNumber = 1,
               updatedAt = datetime('now')`,
        )
        .run();
      sequences[table] = result.changes;
    }

    return { deleted, sequences };
  });

  return run();
}
