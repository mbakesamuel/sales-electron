import { getDatabase } from "../db/index.js";

export interface StockDocumentNumberSettings {
  autoGenerateReceiptNo: boolean;
  autoGenerateTransferNo: boolean;
}

export function loadStockTransferReceiveUsesDocumentDate(): boolean {
  try {
    const db = getDatabase();
    const columns = db
      .prepare(`PRAGMA table_info(CompanySettings)`)
      .all() as Array<{ name: string }>;
    if (!columns.some((col) => col.name === "stockTransferReceiveUsesDocumentDate")) {
      return false;
    }

    const row = db
      .prepare(
        `SELECT stockTransferReceiveUsesDocumentDate
         FROM CompanySettings
         WHERE id = 'default'`,
      )
      .get() as { stockTransferReceiveUsesDocumentDate: number | null } | undefined;

    return Number(row?.stockTransferReceiveUsesDocumentDate ?? 0) !== 0;
  } catch {
    return false;
  }
}

export function loadStockDocumentNumberSettings(): StockDocumentNumberSettings {
  const defaults: StockDocumentNumberSettings = {
    autoGenerateReceiptNo: true,
    autoGenerateTransferNo: true,
  };

  try {
    const db = getDatabase();
    const columns = db
      .prepare(`PRAGMA table_info(CompanySettings)`)
      .all() as Array<{ name: string }>;
    const names = new Set(columns.map((col) => col.name));
    if (
      !names.has("autoGenerateStockReceiptNo") ||
      !names.has("autoGenerateStockTransferNo")
    ) {
      return defaults;
    }

    const row = db
      .prepare(
        `SELECT autoGenerateStockReceiptNo, autoGenerateStockTransferNo
         FROM CompanySettings
         WHERE id = 'default'`,
      )
      .get() as
      | {
          autoGenerateStockReceiptNo: number | null;
          autoGenerateStockTransferNo: number | null;
        }
      | undefined;

    if (!row) {
      return defaults;
    }

    return {
      autoGenerateReceiptNo: Number(row.autoGenerateStockReceiptNo ?? 1) !== 0,
      autoGenerateTransferNo: Number(row.autoGenerateStockTransferNo ?? 1) !== 0,
    };
  } catch {
    return defaults;
  }
}

export function normalizeStockDocumentNumber(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}
