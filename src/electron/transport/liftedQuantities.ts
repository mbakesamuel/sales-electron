import { getDatabase } from "../db/index.js";
import { parseQty } from "../reports/shared.js";

export interface LiftedSaleLineRecord {
  saleId: string;
  dateIssued: string;
  invoiceNo: string | null;
  deliveryOrderNo: string | null;
  customerId: number;
  customerName: string;
  salesPointId: number;
  salesPointName: string;
  productId: number;
  productName: string;
  productCode: string;
  qtyKg: number;
}

export interface LiftedSaleLineFilters {
  customerId?: number;
  salesPointId?: number;
  productId?: number;
}

export function loadLiftedSaleLines(
  fromIso: string,
  toIso: string,
  filters: LiftedSaleLineFilters = {},
): LiftedSaleLineRecord[] {
  const conditions = [
    "s.status = 'VALIDATED'",
    "s.dateIssued >= ?",
    "s.dateIssued <= ?",
    "COALESCE(pc.isBottled, 0) = 0",
    "COALESCE(p.excludeFromSales, 0) = 0",
  ];
  const params: Array<string | number> = [fromIso, toIso];

  if (filters.customerId != null) {
    conditions.push("s.customerId = ?");
    params.push(filters.customerId);
  }
  if (filters.salesPointId != null) {
    conditions.push("s.salesPointId = ?");
    params.push(filters.salesPointId);
  }
  if (filters.productId != null) {
    conditions.push("sl.productId = ?");
    params.push(filters.productId);
  }

  return getDatabase()
    .prepare(
      `SELECT s.id AS saleId,
              s.dateIssued,
              s.invoiceNo,
              s.deliveryOrderNo,
              s.customerId,
              COALESCE(c.name, s.customerNameSnapshot, '') AS customerName,
              s.salesPointId,
              COALESCE(sp.name, '') AS salesPointName,
              sl.productId,
              COALESCE(p.productName, '') AS productName,
              COALESCE(p.productCode, '') AS productCode,
              sl.qtyKg
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       INNER JOIN Product p ON p.productId = sl.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       LEFT JOIN Customer c ON c.id = s.customerId
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       WHERE ${conditions.join(" AND ")}
       ORDER BY s.dateIssued ASC, s.invoiceNo ASC`,
    )
    .all(...params)
    .map((row) => ({
      saleId: String((row as { saleId: string }).saleId),
      dateIssued: String((row as { dateIssued: string }).dateIssued).slice(0, 10),
      invoiceNo: (row as { invoiceNo: string | null }).invoiceNo,
      deliveryOrderNo: (row as { deliveryOrderNo: string | null }).deliveryOrderNo,
      customerId: (row as { customerId: number }).customerId,
      customerName: String((row as { customerName: string }).customerName),
      salesPointId: (row as { salesPointId: number }).salesPointId,
      salesPointName: String((row as { salesPointName: string }).salesPointName),
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      productCode: String((row as { productCode: string }).productCode),
      qtyKg: parseQty((row as { qtyKg: string }).qtyKg),
    }));
}
