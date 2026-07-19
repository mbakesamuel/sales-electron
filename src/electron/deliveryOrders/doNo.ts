import type Database from "better-sqlite3";

export function allocateDeliveryOrderNo(db: Database.Database): string {
  const year = new Date().getFullYear();
  const prefix = `DO-${year}-`;
  const last = db
    .prepare(
      `SELECT deliveryOrderNo FROM DeliveryOrder
       WHERE deliveryOrderNo LIKE ?
       ORDER BY deliveryOrderNo DESC
       LIMIT 1`,
    )
    .get(`${prefix}%`) as { deliveryOrderNo: string } | undefined;

  let next = 1;
  if (last?.deliveryOrderNo) {
    const match = last.deliveryOrderNo.match(/-(\d+)$/);
    if (match) {
      next = Number.parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(next).padStart(6, "0")}`;
}

export function allocateCarryForwardDeliveryOrderNo(db: Database.Database): string {
  const year = new Date().getFullYear();
  const prefix = `CF-${year}-`;
  const last = db
    .prepare(
      `SELECT deliveryOrderNo FROM DeliveryOrder
       WHERE deliveryOrderNo LIKE ?
       ORDER BY deliveryOrderNo DESC
       LIMIT 1`,
    )
    .get(`${prefix}%`) as { deliveryOrderNo: string } | undefined;

  let next = 1;
  if (last?.deliveryOrderNo) {
    const match = last.deliveryOrderNo.match(/-(\d+)$/);
    if (match) {
      next = Number.parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(next).padStart(6, "0")}`;
}
