import type {
  CommitmentReport,
  CommitmentReportRow,
  CommitmentReportSection,
} from "../../shared/reports.types.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import { loadReportCompanySettings, loadReportDisplaySettings, loadReportComments } from "./companySettings.js";
import {
  loadProducts,
  loadSalesPoints,
  nowIso,
  parseQty,
  sum,
  type ProductRow,
  type SalesPointRow,
} from "./shared.js";
import { getDatabase } from "../db/index.js";

interface CategoryRow {
  productCatId: number;
  productCat: string;
  isMain: number;
  isBottled: number;
}

interface OutstandingCommitment {
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

const SECTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function loadCategories(): CategoryRow[] {
  return getDatabase()
    .prepare(
      `SELECT productCatId, productCat, isMain, isBottled
       FROM ProductCat
       ORDER BY isBottled ASC, isMain DESC, productCat ASC`,
    )
    .all() as CategoryRow[];
}

function loadOutstandingCommitments(hideZero: boolean): OutstandingCommitment[] {
  const rows = getDatabase()
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
       WHERE d.status = 'VALIDATED'`,
    )
    .all() as Array<{
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
  const soldRows = getDatabase()
    .prepare(
      `SELECT s.deliveryOrderNo, sl.productId, SUM(CAST(sl.qtyKg AS REAL)) AS soldQty
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       WHERE s.deliveryOrderNo IS NOT NULL
         AND s.status IN ('PENDING', 'VALIDATED')
       GROUP BY s.deliveryOrderNo, sl.productId`,
    )
    .all() as Array<{ deliveryOrderNo: string; productId: number; soldQty: number }>;

  for (const row of soldRows) {
    soldByDoProduct.set(`${row.deliveryOrderNo}:${row.productId}`, parseQty(row.soldQty));
  }

  const totals = new Map<string, OutstandingCommitment>();

  for (const row of rows) {
    const sold = soldByDoProduct.get(`${row.deliveryOrderNo}:${row.productId}`) ?? 0;
    const outstanding = Math.max(row.orderQty - sold, 0);
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

function qtyForSalesPoint(
  commitments: OutstandingCommitment[],
  salesPointId: number,
  predicate: (row: OutstandingCommitment) => boolean,
): number {
  return sum(
    commitments
      .filter((row) => predicate(row) && row.salesPointId === salesPointId)
      .map((row) => row.qty),
  );
}

function buildRowLabel(
  customerName: string,
  productName: string,
  aggregateByCustomerOnly: boolean,
): string {
  const customer = customerName.trim().toUpperCase();
  if (aggregateByCustomerOnly) {
    return customer;
  }

  const product = productName.trim().toUpperCase();
  if (customer.includes(product) || product.includes(customer)) {
    return `${customer} [${product}]`;
  }

  return `${customer} [${product}]`;
}

function buildSection(
  sectionLetter: string,
  category: CategoryRow,
  salesPoints: SalesPointRow[],
  commitments: OutstandingCommitment[],
  products: ProductRow[],
  hideZero: boolean,
): CommitmentReportSection | null {
  const categoryProducts = products.filter((product) => product.productCatId === category.productCatId);
  if (categoryProducts.length === 0) {
    return null;
  }

  const categoryCommitments = commitments.filter((row) => row.productCatId === category.productCatId);
  const aggregateByCustomer = category.isMain === 1;
  const salesPointNames = salesPoints.map((salesPoint) => salesPoint.name.toUpperCase());

  const rowKeys = new Map<string, { customerName: string; productName: string }>();

  if (aggregateByCustomer) {
    for (const commitment of categoryCommitments) {
      const key = String(commitment.customerId);
      if (!rowKeys.has(key)) {
        rowKeys.set(key, {
          customerName: commitment.customerName,
          productName: commitment.productName,
        });
      }
    }
  } else {
    for (const commitment of categoryCommitments) {
      const key = `${commitment.customerId}:${commitment.productId}`;
      if (!rowKeys.has(key)) {
        rowKeys.set(key, {
          customerName: commitment.customerName,
          productName: commitment.productName,
        });
      }
    }
  }

  const dataRows: CommitmentReportRow[] = [...rowKeys.entries()]
    .map(([key, meta]) => {
      const predicate = aggregateByCustomer
        ? (row: OutstandingCommitment) => String(row.customerId) === key
        : (row: OutstandingCommitment) => `${row.customerId}:${row.productId}` === key;

      const quantities = salesPoints.map((salesPoint) =>
        qtyForSalesPoint(categoryCommitments, salesPoint.id, predicate),
      );
      const rowTotal = sum(quantities);

      return {
        label: buildRowLabel(meta.customerName, meta.productName, aggregateByCustomer),
        quantities,
        rowTotal,
        kind: "data" as const,
      };
    })
    .filter((row) => !hideZero || row.rowTotal > 0)
    .sort((left, right) => left.label.localeCompare(right.label));

  const columnTotals = salesPoints.map((salesPoint) =>
    sum(
      categoryCommitments
        .filter((row) => row.salesPointId === salesPoint.id)
        .map((row) => row.qty),
    ),
  );
  const grandTotal = sum(columnTotals);

  const rows: CommitmentReportRow[] = [
    ...dataRows,
    {
      label: "TOTAL",
      quantities: columnTotals,
      rowTotal: grandTotal,
      kind: "total",
    },
  ];

  return {
    sectionLetter,
    title: category.productCat.toUpperCase(),
    salesPointNames,
    rows,
    columnTotals,
    grandTotal,
  };
}

export function getCommitmentReport(userId?: string | null): CommitmentReport {
  const settings = loadReportCompanySettings(userId);
  const { hideZeroReportRows: hideZero } = loadReportDisplaySettings();
  const salesPoints = loadSalesPoints();
  const categories = loadCategories();
  const products = loadProducts();
  const commitments = loadOutstandingCommitments(hideZero);

  const sections: CommitmentReportSection[] = [];
  let sectionIndex = 0;

  for (const category of categories) {
    const sectionLetter = SECTION_LETTERS[sectionIndex] ?? String(sectionIndex + 1);
    const section = buildSection(
      sectionLetter,
      category,
      salesPoints,
      commitments,
      products,
      hideZero,
    );
    if (section) {
      sections.push(section);
      sectionIndex += 1;
    }
  }

  const salesPointNames = salesPoints.map((salesPoint) => salesPoint.name.toUpperCase());
  const columnTotals = salesPoints.map((_, columnIndex) =>
    sum(sections.map((section) => section.columnTotals[columnIndex] ?? 0)),
  );
  const grandTotal = sum(columnTotals);

  const { asAtIso } = resolveReportAsAt();

  return {
    settings,
    asAtIso,
    generatedAtIso: nowIso(),
    sections,
    salesPointNames,
    columnTotals,
    grandTotal,
    comments: loadReportComments("commitment-report"),
  };
}
