import type {
  AvailableDeliveryOrderRow,
  DeliveryOrderLookupResult,
} from "../../shared/sales.types.js";
import { getDatabase } from "../db/index.js";
import { parseAmount, trimQty } from "./money.js";

function parseCustomerId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function getSoldQtyForDoProduct(
  deliveryOrderNo: string,
  productId: number,
): number {
  const row = getDatabase()
    .prepare(
      `SELECT COALESCE(SUM(CAST(sl.qtyKg AS REAL)), 0) AS soldQty
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       WHERE s.deliveryOrderNo = ? AND sl.productId = ?`,
    )
    .get(deliveryOrderNo, productId) as { soldQty: number };

  return row.soldQty;
}

export function listAvailableDeliveryOrders(
  salesPointId: number,
  customerId: number,
): AvailableDeliveryOrderRow[] {
  if (!Number.isFinite(salesPointId) || !Number.isFinite(customerId)) {
    return [];
  }

  const orders = getDatabase()
    .prepare(
      `SELECT d.id, d.deliveryOrderNo, d.dateIssued, c.name AS customerName,
              COALESCE(d.sourceKind, 'NORMAL') AS sourceKind
       FROM DeliveryOrder d
       INNER JOIN Customer c ON c.id = d.customerId
       WHERE d.salesPointId = ?
         AND d.customerId = ?
         AND d.status = 'VALIDATED'
       ORDER BY d.dateIssued DESC, d.deliveryOrderNo DESC
       LIMIT 100`,
    )
    .all(salesPointId, customerId) as Array<{
    id: number;
    deliveryOrderNo: string;
    dateIssued: string;
    customerName: string;
    sourceKind: string;
  }>;

  const rows: AvailableDeliveryOrderRow[] = [];

  for (const order of orders) {
    const details = getDatabase()
      .prepare(
        `SELECT dd.productId, p.productName, dd.orderQty
         FROM DeliveryOrderDetails dd
         INNER JOIN Product p ON p.productId = dd.productId
         WHERE dd.deliveryOrderId = ?
         ORDER BY p.productName ASC, dd.id ASC`,
      )
      .all(order.id) as Array<{
      productId: number;
      productName: string;
      orderQty: number;
    }>;

    for (const detail of details) {
      const sold = getSoldQtyForDoProduct(order.deliveryOrderNo, detail.productId);
      const balanceKg = Math.max(detail.orderQty - sold, 0);
      if (balanceKg <= 0) {
        continue;
      }

      rows.push({
        deliveryOrderNo: order.deliveryOrderNo,
        customerName: order.customerName,
        dateIssued: order.dateIssued.slice(0, 10),
        productId: detail.productId,
        productName: detail.productName,
        balanceKg: trimQty(balanceKg),
        isCarryForward: order.sourceKind === "CARRY_FORWARD",
      });
    }
  }

  return rows;
}

export function lookupDeliveryOrder(
  deliveryOrderNo: string,
  salesPointId: number,
  selectedCustomerId: string,
): DeliveryOrderLookupResult | null {
  const trimmed = deliveryOrderNo.trim();
  if (!trimmed || !Number.isFinite(salesPointId)) {
    return null;
  }

  const order = getDatabase()
    .prepare(
      `SELECT d.id, d.deliveryOrderNo, d.dateIssued, d.customerId, c.name AS customerName
       FROM DeliveryOrder d
       INNER JOIN Customer c ON c.id = d.customerId
       WHERE d.deliveryOrderNo = ? AND d.salesPointId = ? AND d.status = 'VALIDATED'`,
    )
    .get(trimmed, salesPointId) as
    | {
        id: number;
        deliveryOrderNo: string;
        dateIssued: string;
        customerId: number;
        customerName: string;
      }
    | undefined;

  if (!order) {
    return null;
  }

  const details = getDatabase()
    .prepare(
      `SELECT dd.productId, p.productName, dd.orderQty, dd.unitPrice
       FROM DeliveryOrderDetails dd
       INNER JOIN Product p ON p.productId = dd.productId
       WHERE dd.deliveryOrderId = ?
       ORDER BY dd.id ASC`,
    )
    .all(order.id) as Array<{
    productId: number;
    productName: string;
    orderQty: number;
    unitPrice: string | null;
  }>;

  const perProduct = details.map((detail) => {
    const soldQty = getSoldQtyForDoProduct(order.deliveryOrderNo, detail.productId);
    const balanceQty = Math.max(detail.orderQty - soldQty, 0);

    return {
      productId: detail.productId,
      productName: detail.productName,
      orderQty: String(detail.orderQty),
      soldQty: trimQty(soldQty),
      balanceQty: trimQty(balanceQty),
      unitPrice: detail.unitPrice ?? "0",
    };
  });

  const totalBalance = perProduct.reduce(
    (sum, row) => sum + parseAmount(row.balanceQty),
    0,
  );

  return {
    deliveryOrderNo: order.deliveryOrderNo,
    dateIssued: order.dateIssued.slice(0, 10),
    customerId: order.customerId,
    customerName: order.customerName,
    customerMatches: order.customerId === parseCustomerId(selectedCustomerId),
    balanceKg: trimQty(totalBalance),
    perProduct,
  };
}
