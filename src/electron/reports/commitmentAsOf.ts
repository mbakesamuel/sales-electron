import type Database from "better-sqlite3";

function parseQty(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface OutstandingCommitmentAsOf {
  customerId: number;
  customerName: string;
  salesPointId: number;
  productId: number;
  productName: string;
  productCatId: number;
  isMain: number;
  isBottled: number;
  categoryName: string;
  qty: number;
}

/**
 * Outstanding DO commitments as of asAtIso (inclusive).
 * Includes validated DOs with dateIssued <= asAt; subtracts sales on those DOs
 * with dateIssued <= asAt (PENDING + VALIDATED). Uses current orderQty (no qty history).
 */
export function loadOutstandingCommitmentsAsOf(
  db: Database.Database,
  asAtDateIso: string,
  options?: { hideZero?: boolean },
): OutstandingCommitmentAsOf[] {
  const asAt = asAtDateIso.slice(0, 10);
  const hideZero = options?.hideZero ?? false;

  const rows = db
    .prepare(
      `SELECT d.customerId, c.name AS customerName, d.salesPointId, dd.productId,
              p.productName, p.productCatId, COALESCE(pc.isMain, 0) AS isMain,
              COALESCE(pc.isBottled, 0) AS isBottled, pc.productCat AS categoryName,
              d.deliveryOrderNo, dd.orderQty
       FROM DeliveryOrder d
       INNER JOIN DeliveryOrderDetails dd ON dd.deliveryOrderId = d.id
       INNER JOIN Customer c ON c.id = d.customerId
       INNER JOIN Product p ON p.productId = dd.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE d.status = 'VALIDATED'
         AND substr(d.dateIssued, 1, 10) <= ?`,
    )
    .all(asAt) as Array<{
    customerId: number;
    customerName: string;
    salesPointId: number;
    productId: number;
    productName: string;
    productCatId: number;
    isMain: number;
    isBottled: number;
    categoryName: string;
    deliveryOrderNo: string;
    orderQty: number;
  }>;

  const soldByDoProduct = new Map<string, number>();
  const soldRows = db
    .prepare(
      `SELECT s.deliveryOrderNo, sl.productId, SUM(CAST(sl.qtyKg AS REAL)) AS soldQty
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       WHERE s.deliveryOrderNo IS NOT NULL
         AND s.status IN ('PENDING', 'VALIDATED')
         AND substr(s.dateIssued, 1, 10) <= ?
       GROUP BY s.deliveryOrderNo, sl.productId`,
    )
    .all(asAt) as Array<{ deliveryOrderNo: string; productId: number; soldQty: number }>;

  for (const row of soldRows) {
    soldByDoProduct.set(`${row.deliveryOrderNo}:${row.productId}`, parseQty(row.soldQty));
  }

  const totals = new Map<string, OutstandingCommitmentAsOf>();

  for (const row of rows) {
    const sold = soldByDoProduct.get(`${row.deliveryOrderNo}:${row.productId}`) ?? 0;
    const outstanding = Math.max(parseQty(row.orderQty) - sold, 0);
    if (hideZero && outstanding <= 0) {
      continue;
    }

    const key = `${row.customerId}:${row.salesPointId}:${row.productId}`;
    const existing = totals.get(key);
    if (existing) {
      existing.qty += outstanding;
      continue;
    }

    totals.set(key, {
      customerId: row.customerId,
      customerName: row.customerName,
      salesPointId: row.salesPointId,
      productId: row.productId,
      productName: row.productName,
      productCatId: row.productCatId,
      isMain: row.isMain,
      isBottled: row.isBottled,
      categoryName: row.categoryName,
      qty: outstanding,
    });
  }

  return [...totals.values()];
}

/** Aggregate as-of outstanding by sales point + product (stock-commitment metrics). */
export function loadCommitmentMetricsAsOf(
  db: Database.Database,
  asAtDateIso: string,
): Array<{ salesPointId: number; productId: number; qty: number }> {
  const totals = new Map<string, number>();
  for (const row of loadOutstandingCommitmentsAsOf(db, asAtDateIso, { hideZero: true })) {
    const key = `${row.salesPointId}:${row.productId}`;
    totals.set(key, (totals.get(key) ?? 0) + row.qty);
  }
  return [...totals.entries()].map(([key, qty]) => {
    const [salesPointId, productId] = key.split(":").map((value) => Number.parseInt(value, 10));
    return { salesPointId, productId, qty };
  });
}
