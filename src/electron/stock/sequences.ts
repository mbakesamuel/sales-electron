import type Database from "better-sqlite3";

function calendarYearFromIso(isoDate: string): number {
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

function allocateSequenceNo(
  db: Database.Database,
  table: "StockReceiptSequence" | "StockTransferSequence" | "StockAdjustmentSequence",
  prefix: "SR" | "ST" | "SA",
  isoDate: string,
): string {
  const calendarYear = calendarYearFromIso(isoDate);
  const existing = db
    .prepare(`SELECT nextNumber FROM ${table} WHERE calendarYear = ?`)
    .get(calendarYear) as { nextNumber: number } | undefined;

  const nextNumber = existing?.nextNumber ?? 1;
  if (existing) {
    db.prepare(
      `UPDATE ${table} SET nextNumber = ?, updatedAt = datetime('now') WHERE calendarYear = ?`,
    ).run(nextNumber + 1, calendarYear);
  } else {
    db.prepare(
      `INSERT INTO ${table} (calendarYear, nextNumber) VALUES (?, ?)`,
    ).run(calendarYear, nextNumber + 1);
  }

  return `${prefix}-${calendarYear}-${String(nextNumber).padStart(6, "0")}`;
}

export function allocateReceiptNo(db: Database.Database, receivedAtIso: string): string {
  return allocateSequenceNo(db, "StockReceiptSequence", "SR", receivedAtIso);
}

export function allocateTransferNo(db: Database.Database, dispatchedAtIso: string): string {
  return allocateSequenceNo(db, "StockTransferSequence", "ST", dispatchedAtIso);
}

export function allocateAdjustmentNo(db: Database.Database, occurredAtIso: string): string {
  return allocateSequenceNo(db, "StockAdjustmentSequence", "SA", occurredAtIso);
}
