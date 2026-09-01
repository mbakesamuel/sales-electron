import {
  isLooseLpoReportProduct,
  isSludgePoolReportProduct,
} from "../../shared/looseLpoProduct.js";
import { getDatabase } from "../db/index.js";
import { loadStockBalancesAsOf } from "../stock/asOfBalance.js";
import { loadStockIntakeOilGrouping } from "../stock/productStorage.js";
import { getSludgeOilPoolProductId } from "../stock/stockIntakeMigration.js";
import { parseQty, type ProductRow, type SalesPointRow } from "./shared.js";
import { parseLocalIso, toIsoDate } from "./weekChoices.js";

export interface LpoSaleLineRecord {
  salesPointId: number | null;
  saleDisposition: string | null;
  customerTypeCode: string;
  customerTypeName: string;
  productId: number;
  productName: string;
  productCode: string | null;
  isBottled: number;
  qtyKg: number;
  qtyUnits: number | null;
}

export interface LpoReceiptLineRecord {
  salesPointId: number;
  supplierLabel: string;
  productId: number;
  productName: string;
  productCode: string | null;
  isBottled: number;
  qty: number;
}

export function dayBeforeIso(isoDate: string): string {
  const date = parseLocalIso(isoDate);
  date.setDate(date.getDate() - 1);
  return toIsoDate(date);
}

function spKey(salesPointId: number): string {
  return String(salesPointId);
}

function zeroValues(salesPoints: SalesPointRow[]): Record<string, number | null> {
  const values: Record<string, number | null> = {};
  for (const salesPoint of salesPoints) {
    values[spKey(salesPoint.id)] = 0;
  }
  return values;
}

export function sumCompanyTotal(values: Record<string, number | null>): number {
  let total = 0;
  for (const value of Object.values(values)) {
    total += value ?? 0;
  }
  return total;
}

export function isLooseLpo(product: {
  productCode?: string | null;
  productName?: string | null;
  isBottled: number;
}): boolean {
  return isLooseLpoReportProduct({
    productCode: product.productCode,
    productName: product.productName,
    isBottled: product.isBottled,
  });
}

function buildLpoReportProductIds(products: ProductRow[]): Set<number> {
  const ids = new Set(
    products.filter((product) => isLooseLpo(product)).map((product) => product.productId),
  );
  if (loadStockIntakeOilGrouping(getDatabase())) {
    const poolId = getSludgeOilPoolProductId(getDatabase());
    if (poolId != null) {
      ids.add(poolId);
    }
  }
  return ids;
}

export function loadLpoSaleLines(fromIso: string, toIso: string): LpoSaleLineRecord[] {
  return getDatabase()
    .prepare(
      `SELECT s.salesPointId, s.saleDisposition, ct.code AS customerTypeCode, ct.name AS customerTypeName,
              sl.productId, p.productName, p.productCode,
              COALESCE(pc.isBottled, 0) AS isBottled, sl.qtyKg, sl.qtyUnits
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       INNER JOIN Product p ON p.productId = sl.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       LEFT JOIN Customer c ON c.id = s.customerId
       LEFT JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
       WHERE s.status = 'VALIDATED'
         AND s.dateIssued >= ?
         AND s.dateIssued <= ?`,
    )
    .all(fromIso, toIso)
    .map((row) => ({
      salesPointId: (row as { salesPointId: number | null }).salesPointId,
      saleDisposition: (row as { saleDisposition: string | null }).saleDisposition,
      customerTypeCode: String((row as { customerTypeCode: string | null }).customerTypeCode ?? ""),
      customerTypeName: String((row as { customerTypeName: string | null }).customerTypeName ?? ""),
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      productCode: (row as { productCode: string | null }).productCode,
      isBottled: (row as { isBottled: number }).isBottled,
      qtyKg: parseQty((row as { qtyKg: string }).qtyKg),
      qtyUnits: (row as { qtyUnits: string | null }).qtyUnits
        ? parseQty((row as { qtyUnits: string }).qtyUnits)
        : null,
    }));
}

export function loadLpoReceiptLines(fromIso: string, toIso: string): LpoReceiptLineRecord[] {
  return getDatabase()
    .prepare(
      `SELECT r.salesPointId, r.supplierLabel, l.productId, p.productName, p.productCode,
              COALESCE(pc.isBottled, 0) AS isBottled, l.qty
       FROM StockReceipt r
       INNER JOIN StockReceiptLine l ON l.receiptId = r.id
       INNER JOIN Product p ON p.productId = l.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE r.status = 'POSTED'
         AND substr(r.receivedAt, 1, 10) >= ?
         AND substr(r.receivedAt, 1, 10) <= ?`,
    )
    .all(fromIso, toIso)
    .map((row) => ({
      salesPointId: (row as { salesPointId: number }).salesPointId,
      supplierLabel: String((row as { supplierLabel: string }).supplierLabel),
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      productCode: (row as { productCode: string | null }).productCode,
      isBottled: (row as { isBottled: number }).isBottled,
      qty: parseQty((row as { qty: string }).qty),
    }));
}

export function sumSellableLpoBySalesPoint(
  salesPoints: SalesPointRow[],
  products: ProductRow[],
  asOfIso: string,
): Record<string, number | null> {
  const lpoProductIds = buildLpoReportProductIds(products);
  const values = zeroValues(salesPoints);
  for (const row of loadStockBalancesAsOf(getDatabase(), asOfIso)) {
    if (row.condition !== "SELLABLE" || !lpoProductIds.has(row.productId)) {
      continue;
    }
    const key = spKey(row.salesPointId);
    if (key in values) {
      values[key] = (values[key] ?? 0) + row.qty;
    }
  }
  return values;
}

export function sumCarryForwardLpoInRange(
  salesPoints: SalesPointRow[],
  products: ProductRow[],
  fromIso: string,
  toIso: string,
): Record<string, number | null> {
  const lpoProductIds = buildLpoReportProductIds(products);
  const values = zeroValues(salesPoints);
  const rows = getDatabase()
    .prepare(
      `SELECT a.salesPointId, l.productId, l.deltaQty
       FROM StockAdjustment a
       INNER JOIN StockAdjustmentLine l ON l.adjustmentId = a.id
       WHERE a.sourceKind = 'CARRY_FORWARD'
         AND a.status = 'POSTED'
         AND substr(a.occurredAt, 1, 10) >= ?
         AND substr(a.occurredAt, 1, 10) <= ?`,
    )
    .all(fromIso, toIso) as Array<{
    salesPointId: number;
    productId: number;
    deltaQty: string;
  }>;

  for (const row of rows) {
    if (!lpoProductIds.has(row.productId)) {
      continue;
    }
    const key = spKey(row.salesPointId);
    if (key in values) {
      values[key] = (values[key] ?? 0) + parseQty(row.deltaQty);
    }
  }
  return values;
}

export function addVectors(
  salesPoints: SalesPointRow[],
  left: Record<string, number | null>,
  right: Record<string, number | null>,
): Record<string, number | null> {
  const values = zeroValues(salesPoints);
  for (const salesPoint of salesPoints) {
    const key = spKey(salesPoint.id);
    values[key] = (left[key] ?? 0) + (right[key] ?? 0);
  }
  return values;
}

export function subtractVectors(
  salesPoints: SalesPointRow[],
  left: Record<string, number | null>,
  right: Record<string, number | null>,
): Record<string, number | null> {
  const values = zeroValues(salesPoints);
  for (const salesPoint of salesPoints) {
    const key = spKey(salesPoint.id);
    values[key] = (left[key] ?? 0) - (right[key] ?? 0);
  }
  return values;
}

export function computeCompanyLpoOpening(
  salesPoints: SalesPointRow[],
  products: ProductRow[],
  periodStartIso: string,
  carryForwardToIso: string,
): number {
  const openingAsOfIso = dayBeforeIso(periodStartIso);
  const priorOpening = sumSellableLpoBySalesPoint(salesPoints, products, openingAsOfIso);
  const carryForward = sumCarryForwardLpoInRange(
    salesPoints,
    products,
    periodStartIso,
    carryForwardToIso,
  );
  return sumCompanyTotal(addVectors(salesPoints, priorOpening, carryForward));
}

export function computeCompanyLpoReceptionTotal(receiptLines: LpoReceiptLineRecord[]): number {
  return receiptLines
    .filter(
      (line) =>
        isLooseLpo(line) ||
        isSludgePoolReportProduct({
          productCode: line.productCode,
          productName: line.productName,
          isBottled: line.isBottled,
        }),
    )
    .reduce((sum, line) => sum + line.qty, 0);
}

export function computeCompanyLpoIssuesTotal(saleLines: LpoSaleLineRecord[]): number {
  return saleLines
    .filter((line) => isLooseLpo(line))
    .reduce((sum, line) => sum + line.qtyKg, 0);
}

export function loadFiscalYearStartIso(financialYearPeriodId: string): string {
  const row = getDatabase()
    .prepare(`SELECT startDate FROM FinancialYearPeriod WHERE id = ?`)
    .get(financialYearPeriodId) as { startDate: string } | undefined;
  if (!row?.startDate) {
    throw new Error("Financial year period not found.");
  }
  return String(row.startDate).slice(0, 10);
}

export function loadFiscalYearStartMonth(): number {
  const row = getDatabase()
    .prepare(`SELECT fiscalYearStartMonth FROM CompanySettings WHERE id = 'default'`)
    .get() as { fiscalYearStartMonth: number } | undefined;
  return Number(row?.fiscalYearStartMonth ?? 1);
}
