import type {
  OtherProductSalesDeliveriesMetrics,
  OtherProductSalesDeliveriesReport,
  OtherProductSalesDeliveriesRow,
  OtherProductSalesDeliveriesSection,
} from "../../shared/reports.types.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import { getDatabase } from "../db/index.js";
import {
  loadReportComments,
  loadReportCompanySettings,
} from "./companySettings.js";
import { nowIso, parseQty } from "./shared.js";

const ROUTE_ID = "other-product-sales-deliveries-report";

interface SaleLineRecord {
  salesPointId: number | null;
  salesPointName: string;
  productId: number;
  productName: string;
  isMain: number;
  isBottled: number;
  qtyKg: number;
  lineNet: number;
}

function emptyMetrics(): OtherProductSalesDeliveriesMetrics {
  return {
    paymentsKg: 0,
    paymentsValue: 0,
    deliveriesKg: 0,
    deliveriesValue: 0,
  };
}

function addDeliveries(
  target: OtherProductSalesDeliveriesMetrics,
  qtyKg: number,
  lineNet: number,
): void {
  target.deliveriesKg += qtyKg;
  target.deliveriesValue += lineNet;
}

function sumMetrics(
  rows: OtherProductSalesDeliveriesMetrics[],
): OtherProductSalesDeliveriesMetrics {
  const total = emptyMetrics();
  for (const row of rows) {
    total.paymentsKg += row.paymentsKg;
    total.paymentsValue += row.paymentsValue;
    total.deliveriesKg += row.deliveriesKg;
    total.deliveriesValue += row.deliveriesValue;
  }
  return total;
}

function roundKg(value: number): number {
  return Math.round(value);
}

function withRoundedKg(
  metrics: OtherProductSalesDeliveriesMetrics,
): OtherProductSalesDeliveriesMetrics {
  return {
    ...metrics,
    paymentsKg: roundKg(metrics.paymentsKg),
    deliveriesKg: roundKg(metrics.deliveriesKg),
  };
}

function loadSaleLines(fromIso: string, toIso: string): SaleLineRecord[] {
  return getDatabase()
    .prepare(
      `SELECT s.salesPointId,
              COALESCE(sp.name, 'Unassigned') AS salesPointName,
              sl.productId, p.productName,
              COALESCE(pc.isMain, 0) AS isMain,
              COALESCE(pc.isBottled, 0) AS isBottled,
              sl.qtyKg, sl.lineNet
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       INNER JOIN Product p ON p.productId = sl.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       WHERE s.status = 'VALIDATED'
         AND s.dateIssued >= ?
         AND s.dateIssued <= ?`,
    )
    .all(fromIso, toIso)
    .map((row) => ({
      salesPointId:
        (row as { salesPointId: number | null }).salesPointId == null
          ? null
          : Number((row as { salesPointId: number }).salesPointId),
      salesPointName: String((row as { salesPointName: string }).salesPointName),
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      isMain: (row as { isMain: number }).isMain,
      isBottled: (row as { isBottled: number }).isBottled,
      qtyKg: parseQty((row as { qtyKg: string }).qtyKg),
      lineNet: parseQty((row as { lineNet: string }).lineNet),
    }));
}

export function getOtherProductSalesDeliveriesReport(
  userId?: string,
): OtherProductSalesDeliveriesReport {
  const { asAtIso, period } = resolveReportAsAt();
  const settings = loadReportCompanySettings(userId, asAtIso);
  const comments = loadReportComments(ROUTE_ID);
  const monthStartIso = period.startDate;
  const monthLabel = `${period.monthName} ${period.financialYear}`.toUpperCase();
  const reportTitle = `OTHER PRODUCT SALES AND DELIVERIES FOR ${monthLabel}`;

  const lines = loadSaleLines(monthStartIso, asAtIso).filter(
    (line) => line.isBottled !== 1 && line.isMain !== 1,
  );

  type ProductAgg = {
    productId: number;
    productName: string;
    metrics: OtherProductSalesDeliveriesMetrics;
  };
  type SpAgg = {
    salesPointId: number | null;
    salesPointName: string;
    products: Map<number, ProductAgg>;
  };

  const bySalesPoint = new Map<string, SpAgg>();

  for (const line of lines) {
    const spKey = line.salesPointId == null ? "none" : String(line.salesPointId);
    let sp = bySalesPoint.get(spKey);
    if (!sp) {
      sp = {
        salesPointId: line.salesPointId,
        salesPointName: line.salesPointName,
        products: new Map(),
      };
      bySalesPoint.set(spKey, sp);
    }

    let product = sp.products.get(line.productId);
    if (!product) {
      product = {
        productId: line.productId,
        productName: line.productName,
        metrics: emptyMetrics(),
      };
      sp.products.set(line.productId, product);
    }
    addDeliveries(product.metrics, line.qtyKg, line.lineNet);
  }

  const sections: OtherProductSalesDeliveriesSection[] = [...bySalesPoint.values()]
    .map((sp) => {
      const productRows: OtherProductSalesDeliveriesRow[] = [...sp.products.values()]
        .map((product) => ({
          id: `sp-${sp.salesPointId ?? "none"}-p-${product.productId}`,
          kind: "product" as const,
          salesPointLabel: sp.salesPointName.toUpperCase(),
          productLabel: product.productName.toUpperCase(),
          productId: product.productId,
          ...withRoundedKg(product.metrics),
        }))
        .sort((a, b) => a.productLabel.localeCompare(b.productLabel));

      const subtotalMetrics = withRoundedKg(sumMetrics(productRows));
      const subtotal: OtherProductSalesDeliveriesRow = {
        id: `sp-${sp.salesPointId ?? "none"}-subtotal`,
        kind: "subtotal",
        salesPointLabel: "SUBTOTAL",
        productLabel: "",
        productId: null,
        ...subtotalMetrics,
      };

      return {
        salesPointId: sp.salesPointId,
        salesPointName: sp.salesPointName,
        productRows,
        subtotal,
      };
    })
    .filter((section) => section.productRows.length > 0)
    .sort((a, b) =>
      a.salesPointName.toUpperCase().localeCompare(b.salesPointName.toUpperCase()),
    );

  const grandTotal: OtherProductSalesDeliveriesRow = {
    id: "grand-total",
    kind: "grandTotal",
    salesPointLabel: "GRAND TOTAL",
    productLabel: "",
    productId: null,
    ...withRoundedKg(sumMetrics(sections.map((section) => section.subtotal))),
  };

  return {
    settings,
    asAtIso,
    monthStartIso,
    monthName: period.monthName,
    financialYear: period.financialYear,
    reportTitle,
    generatedAtIso: nowIso(),
    sections,
    grandTotal,
    comments,
  };
}
