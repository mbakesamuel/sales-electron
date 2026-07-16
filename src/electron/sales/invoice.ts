import type Database from "better-sqlite3";
import { createTextPrimaryKey } from "../db/tableMeta.js";

export function allocateInvoiceNo(db: Database.Database): string {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = db
    .prepare(
      `SELECT invoiceNo FROM Sale
       WHERE invoiceNo LIKE ?
       ORDER BY invoiceNo DESC
       LIMIT 1`,
    )
    .get(`${prefix}%`) as { invoiceNo: string } | undefined;

  let next = 1;
  if (last?.invoiceNo) {
    const match = last.invoiceNo.match(/-(\d+)$/);
    if (match) {
      next = Number.parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(next).padStart(6, "0")}`;
}

export function newSaleLineId(): string {
  return createTextPrimaryKey();
}

export function newPaymentId(): string {
  return createTextPrimaryKey();
}

export function newSaleId(): string {
  return createTextPrimaryKey();
}
