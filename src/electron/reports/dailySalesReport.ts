import type {
  DailySalesReport,
  DailySalesReportLine,
} from "../../shared/reports.types.js";
import { getDatabase } from "../db/index.js";
import {
  loadReportCompanySettings,
  loadReportComments,
} from "./companySettings.js";
import { loadSalesPoints, nowIso, parseQty } from "./shared.js";

const SUMMARY_ROWS = [
  { id: "industries", label: "INDUSTRIES" },
  { id: "wholesales", label: "WHOLE SALE" },
  { id: "retail", label: "RETAIL" },
  { id: "cdcWorkers", label: "CDC WORKERS" },
  { id: "proSamples", label: "PRO/SAMPLES" },
] as const;

type DailyCustomerCategory = (typeof SUMMARY_ROWS)[number]["id"];

interface RawSaleLine {
  saleId: string;
  soldAt: string;
  createdAt: string;
  customerName: string;
  deliveryOrderNo: string | null;
  dateIssued: string;
  vehicleNumber: string;
  saleDisposition: string | null;
  productId: number;
  productName: string;
  isBottled: number;
  qtyKg: number;
  qtyUnits: number | null;
  customerTypeCode: string;
  customerTypeName: string;
}

function normalizeReportDate(value: string): string | null {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function resolveDailyCustomerCategory(
  saleDisposition: string | null,
  customerTypeCode: string,
  customerTypeName: string,
): DailyCustomerCategory {
  if (saleDisposition === "PUBLIC_RELATION") {
    return "proSamples";
  }
  if (saleDisposition === "RATION") {
    return "cdcWorkers";
  }

  const text = `${customerTypeCode} ${customerTypeName}`.toUpperCase();
  if (text.includes("WHOLESALE")) {
    return "wholesales";
  }
  if (text.includes("RETAIL")) {
    return "retail";
  }
  if (text.includes("INDUSTR")) {
    return "industries";
  }
  return "cdcWorkers";
}

function lineQuantity(line: RawSaleLine): number {
  if (line.isBottled === 1) {
    return line.qtyUnits ?? line.qtyKg;
  }
  return line.qtyKg;
}

function loadRawSaleLines(
  reportDateIso: string,
  salesPointId: number | null,
): RawSaleLine[] {
  const params: Array<string | number> = [reportDateIso];
  let salesPointClause = "";

  if (salesPointId != null && Number.isFinite(salesPointId)) {
    salesPointClause = " AND s.salesPointId = ?";
    params.push(salesPointId);
  }

  return getDatabase()
    .prepare(
      `SELECT s.id AS saleId, s.soldAt, s.createdAt,
              s.customerNameSnapshot AS customerName, s.deliveryOrderNo, s.dateIssued,
              s.vehicleNumber, s.saleDisposition,
              sl.productId, p.productName,
              COALESCE(pc.isBottled, 0) AS isBottled,
              sl.qtyKg, sl.qtyUnits,
              ct.code AS customerTypeCode, ct.name AS customerTypeName
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       INNER JOIN Product p ON p.productId = sl.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       LEFT JOIN Customer c ON c.id = s.customerId
       LEFT JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
       WHERE s.status = 'VALIDATED'
         AND substr(s.dateIssued, 1, 10) = ?
         ${salesPointClause}
       ORDER BY p.productName ASC, s.soldAt ASC, s.createdAt ASC, s.id ASC, sl.id ASC`,
    )
    .all(...params)
    .map((row) => ({
      saleId: String((row as { saleId: string }).saleId),
      soldAt: String((row as { soldAt: string }).soldAt),
      createdAt: String((row as { createdAt: string }).createdAt),
      customerName: String((row as { customerName: string }).customerName),
      deliveryOrderNo: (row as { deliveryOrderNo: string | null }).deliveryOrderNo
        ? String((row as { deliveryOrderNo: string }).deliveryOrderNo)
        : null,
      dateIssued: String((row as { dateIssued: string }).dateIssued),
      vehicleNumber: String((row as { vehicleNumber: string }).vehicleNumber),
      saleDisposition: (row as { saleDisposition: string | null }).saleDisposition,
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      isBottled: (row as { isBottled: number }).isBottled,
      qtyKg: parseQty((row as { qtyKg: string }).qtyKg),
      qtyUnits: (row as { qtyUnits: string | null }).qtyUnits
        ? parseQty((row as { qtyUnits: string }).qtyUnits)
        : null,
      customerTypeCode: String(
        (row as { customerTypeCode: string | null }).customerTypeCode ?? "",
      ),
      customerTypeName: String(
        (row as { customerTypeName: string | null }).customerTypeName ?? "",
      ),
    }));
}

function loadDoOrderQty(deliveryOrderNo: string, productId: number): number | null {
  const row = getDatabase()
    .prepare(
      `SELECT dd.orderQty
       FROM DeliveryOrder d
       INNER JOIN DeliveryOrderDetails dd ON dd.deliveryOrderId = d.id
       WHERE d.deliveryOrderNo = ?
         AND dd.productId = ?
       LIMIT 1`,
    )
    .get(deliveryOrderNo, productId) as { orderQty: number } | undefined;

  return row ? Number(row.orderQty) || 0 : null;
}

function buildDoBalanceLookup(
  reportDateIso: string,
  pairs: Array<{ deliveryOrderNo: string; productId: number }>,
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  if (pairs.length === 0) {
    return result;
  }

  const db = getDatabase();

  for (const pair of pairs) {
    const key = `${pair.deliveryOrderNo}|${pair.productId}`;
    const orderQty = loadDoOrderQty(pair.deliveryOrderNo, pair.productId);
    if (orderQty == null) {
      continue;
    }

    const saleRows = db
      .prepare(
        `SELECT s.id AS saleId, s.soldAt, s.createdAt,
                COALESCE(SUM(CAST(sl.qtyKg AS REAL)), 0) AS soldQty
         FROM Sale s
         INNER JOIN SaleLine sl ON sl.saleId = s.id
         WHERE s.status = 'VALIDATED'
           AND s.deliveryOrderNo = ?
           AND sl.productId = ?
           AND substr(s.dateIssued, 1, 10) <= ?
         GROUP BY s.id, s.soldAt, s.createdAt
         ORDER BY s.soldAt ASC, s.createdAt ASC, s.id ASC`,
      )
      .all(pair.deliveryOrderNo, pair.productId, reportDateIso) as Array<{
      saleId: string;
      soldAt: string;
      createdAt: string;
      soldQty: number;
    }>;

    const cumulativeBySale = new Map<string, number>();
    let running = 0;
    for (const saleRow of saleRows) {
      running += Number(saleRow.soldQty) || 0;
      cumulativeBySale.set(String(saleRow.saleId), Math.max(0, orderQty - running));
    }

    result.set(key, cumulativeBySale);
  }

  return result;
}

function resolveDoBalance(
  lookup: Map<string, Map<string, number>>,
  deliveryOrderNo: string | null,
  productId: number,
  saleId: string,
): number | null {
  if (!deliveryOrderNo) {
    return null;
  }

  const cumulativeBySale = lookup.get(`${deliveryOrderNo}|${productId}`);
  if (!cumulativeBySale) {
    return null;
  }

  return cumulativeBySale.get(saleId) ?? null;
}

export function getDailySalesReport(
  _userId: string,
  reportDateIso: string,
  salesPointId?: number | null,
): DailySalesReport {
  const normalizedDate = normalizeReportDate(reportDateIso);
  if (!normalizedDate) {
    throw new Error("Invalid report date.");
  }

  const selectedSalesPointId =
    salesPointId != null && Number.isFinite(Number(salesPointId))
      ? Number(salesPointId)
      : null;
  const salesPointOptions = loadSalesPoints();
  const salesPointLabel =
    selectedSalesPointId == null
      ? "ALL SALES POINTS"
      : (salesPointOptions.find((point) => point.id === selectedSalesPointId)?.name ??
        "UNKNOWN SALES POINT");

  const rawLines = loadRawSaleLines(normalizedDate, selectedSalesPointId);

  const doPairs = Array.from(
    new Map(
      rawLines
        .filter((line) => line.deliveryOrderNo)
        .map((line) => [
          `${line.deliveryOrderNo}|${line.productId}`,
          {
            deliveryOrderNo: line.deliveryOrderNo as string,
            productId: line.productId,
          },
        ]),
    ).values(),
  );
  const doBalanceLookup = buildDoBalanceLookup(normalizedDate, doPairs);

  const summaryTotals = new Map<DailyCustomerCategory, number>(
    SUMMARY_ROWS.map((row) => [row.id, 0]),
  );

  const sectionsByProduct = new Map<
    number,
    { productName: string; rows: DailySalesReportLine[] }
  >();

  for (const line of rawLines) {
    const quantity = lineQuantity(line);
    const category = resolveDailyCustomerCategory(
      line.saleDisposition,
      line.customerTypeCode,
      line.customerTypeName,
    );
    summaryTotals.set(category, (summaryTotals.get(category) ?? 0) + quantity);

    const doBalance = resolveDoBalance(
      doBalanceLookup,
      line.deliveryOrderNo,
      line.productId,
      line.saleId,
    );

    const section = sectionsByProduct.get(line.productId) ?? {
      productName: line.productName,
      rows: [],
    };

    section.rows.push({
      sn: section.rows.length + 1,
      customerName: line.customerName,
      deliveryOrderNo: line.deliveryOrderNo,
      dateIssuedIso: line.dateIssued.slice(0, 10),
      vehicleNumber:
        line.vehicleNumber && line.vehicleNumber !== "BPO-OUTBOUND"
          ? line.vehicleNumber
          : null,
      quantity,
      quantityLabel: line.isBottled === 1 ? "unit" : "kg",
      doBalance,
    });
    sectionsByProduct.set(line.productId, section);
  }

  const sections = Array.from(sectionsByProduct.values())
    .sort((left, right) => left.productName.localeCompare(right.productName))
    .map((section) => ({
      productName: section.productName,
      rows: section.rows,
      subtotalQuantity: section.rows.reduce((total, row) => total + row.quantity, 0),
      subtotalDoBalance: section.rows.reduce(
        (total, row) => total + (row.doBalance ?? 0),
        0,
      ),
    }));

  const grandTotalQuantity = sections.reduce(
    (total, section) => total + section.subtotalQuantity,
    0,
  );
  const grandTotalDoBalance = sections.reduce(
    (total, section) => total + section.subtotalDoBalance,
    0,
  );

  const summaryRows = SUMMARY_ROWS.map((row) => ({
    id: row.id,
    label: row.label,
    quantity: summaryTotals.get(row.id) ?? 0,
  }));
  const summaryGrandTotal = summaryRows.reduce((total, row) => total + row.quantity, 0);

  return {
    settings: loadReportCompanySettings(),
    reportDateIso: normalizedDate,
    selectedSalesPointId,
    salesPointLabel,
    generatedAtIso: nowIso(),
    sections,
    grandTotalQuantity,
    grandTotalDoBalance,
    summaryRows,
    summaryGrandTotal,
    salesPointOptions,
    comments: loadReportComments("daily-sales-report"),
  };
}
