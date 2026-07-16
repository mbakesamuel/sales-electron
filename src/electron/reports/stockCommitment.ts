import type {
  BottledPackColumn,
  StockCommitmentBottledSection,
  StockCommitmentReport,
  StockCommitmentReportRow,
  StockCommitmentReportSection,
} from "../../shared/reports.types.js";
import { getDatabase } from "../db/index.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import { loadReportCompanySettings } from "./companySettings.js";

const PALM_OIL_KG_PER_LITRE = 0.85;

interface SalesPointRow {
  id: number;
  name: string;
}

interface CategoryRow {
  productCatId: number;
  productCat: string;
  isMain: number;
  isBottled: number;
}

interface ProductRow {
  productId: number;
  productName: string;
  productCode: string | null;
  productCatId: number;
  uom: string;
}

interface MetricRow {
  salesPointId: number;
  productId: number;
  qty: number;
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function parseQty(value: string | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function loadSalesPoints(): SalesPointRow[] {
  return getDatabase()
    .prepare(`SELECT id, name FROM SalesPoint ORDER BY name ASC`)
    .all() as SalesPointRow[];
}

function loadCategories(): CategoryRow[] {
  return getDatabase()
    .prepare(
      `SELECT productCatId, productCat, isMain, isBottled
       FROM ProductCat
       ORDER BY isMain DESC, productCat ASC`,
    )
    .all() as CategoryRow[];
}

function loadProducts(): ProductRow[] {
  return getDatabase()
    .prepare(
      `SELECT productId, productName, productCode, productCatId, uom
       FROM Product
       ORDER BY productName ASC`,
    )
    .all() as ProductRow[];
}

function loadStockMetrics(): MetricRow[] {
  return getDatabase()
    .prepare(
      `SELECT sb.salesPointId, sb.productId, SUM(CAST(sb.qty AS REAL)) AS qty
       FROM StockBalance sb
       WHERE sb.condition = 'SELLABLE'
       GROUP BY sb.salesPointId, sb.productId`,
    )
    .all()
    .map((row) => ({
      salesPointId: (row as { salesPointId: number }).salesPointId,
      productId: (row as { productId: number }).productId,
      qty: parseQty((row as { qty: number }).qty),
    }));
}

function loadCommitmentMetrics(): MetricRow[] {
  const rows = getDatabase()
    .prepare(
      `SELECT d.salesPointId, dd.productId, d.deliveryOrderNo, dd.orderQty
       FROM DeliveryOrder d
       INNER JOIN DeliveryOrderDetails dd ON dd.deliveryOrderId = d.id
       WHERE d.status = 'VALIDATED'`,
    )
    .all() as Array<{
    salesPointId: number;
    productId: number;
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

  const totals = new Map<string, number>();
  for (const row of rows) {
    const sold = soldByDoProduct.get(`${row.deliveryOrderNo}:${row.productId}`) ?? 0;
    const outstanding = Math.max(row.orderQty - sold, 0);
    if (outstanding <= 0) {
      continue;
    }
    const key = `${row.salesPointId}:${row.productId}`;
    totals.set(key, (totals.get(key) ?? 0) + outstanding);
  }

  return [...totals.entries()].map(([key, qty]) => {
    const [salesPointId, productId] = key.split(":").map((value) => Number.parseInt(value, 10));
    return { salesPointId, productId, qty };
  });
}

function metricForProductAtSalesPoint(
  productId: number,
  salesPointId: number,
  stockMetrics: MetricRow[],
  commitmentMetrics: MetricRow[],
): { stockKg: number; commitmentKg: number; balanceKg: number } {
  const stockKg =
    stockMetrics.find(
      (metric) => metric.salesPointId === salesPointId && metric.productId === productId,
    )?.qty ?? 0;
  const commitmentKg =
    commitmentMetrics.find(
      (metric) => metric.salesPointId === salesPointId && metric.productId === productId,
    )?.qty ?? 0;
  return {
    stockKg,
    commitmentKg,
    balanceKg: stockKg - commitmentKg,
  };
}

function makeDataRow(
  label: string,
  salesPointName: string | null,
  metrics: { stockKg: number; commitmentKg: number; balanceKg: number },
  kind: StockCommitmentReportRow["kind"] = "data",
  indent = false,
): StockCommitmentReportRow {
  return {
    label,
    salesPointName,
    stockKg: metrics.stockKg,
    commitmentKg: metrics.commitmentKg,
    balanceKg: metrics.balanceKg,
    kind,
    indent,
  };
}

function makeTotalRow(
  label: string,
  rows: StockCommitmentReportRow[],
  kind: StockCommitmentReportRow["kind"],
): StockCommitmentReportRow {
  const dataRows = rows.filter((row) => row.kind === "data");
  return {
    label,
    salesPointName: null,
    stockKg: sum(dataRows.map((row) => row.stockKg)),
    commitmentKg: sum(dataRows.map((row) => row.commitmentKg)),
    balanceKg: sum(dataRows.map((row) => row.balanceKg)),
    kind,
  };
}

function buildProductSection(
  sectionNo: number,
  product: ProductRow,
  salesPoints: SalesPointRow[],
  stockMetrics: MetricRow[],
  commitmentMetrics: MetricRow[],
): StockCommitmentReportSection {
  const title = product.productName.toUpperCase();
  const rows: StockCommitmentReportRow[] = [
    {
      label: `${sectionNo}. ${title}`,
      salesPointName: null,
      stockKg: null,
      commitmentKg: null,
      balanceKg: null,
      kind: "header",
    },
  ];

  const dataRows = salesPoints.map((salesPoint) => {
    const metrics = metricForProductAtSalesPoint(
      product.productId,
      salesPoint.id,
      stockMetrics,
      commitmentMetrics,
    );
    return makeDataRow("", salesPoint.name, metrics);
  });

  rows.push(...dataRows);
  rows.push(makeTotalRow("SUBTOTAL", dataRows, "subtotal"));

  return {
    sectionNo,
    title,
    rows,
  };
}

function detectBottledPack(product: ProductRow): BottledPackColumn {
  const text = `${product.productName} ${product.productCode ?? ""}`.toUpperCase();
  if (text.includes("20L") || text.includes("JUG")) {
    return { id: "jug20", label: "1X20L JUG", units: 0, litresPerUnit: 20 };
  }
  if (text.includes("3X5") || (text.includes("5L") && text.includes("CTN"))) {
    return { id: "carton5", label: "3X5L CTN", units: 0, litresPerUnit: 15 };
  }
  if (text.includes("15L")) {
    return { id: "carton15", label: "1X15L CTN", units: 0, litresPerUnit: 15 };
  }
  if (text.includes("1L")) {
    return { id: "unit1", label: "1L BOTTLE", units: 0, litresPerUnit: 1 };
  }
  return { id: "other", label: "OTHER", units: 0, litresPerUnit: 1 };
}

const BOTTLED_PACK_ORDER = ["jug20", "carton5", "carton15", "unit1", "other"] as const;

function buildBottledSection(
  sectionNo: number,
  category: CategoryRow,
  products: ProductRow[],
  stockMetrics: MetricRow[],
): StockCommitmentBottledSection | null {
  const bottledProducts = products.filter((product) => product.productCatId === category.productCatId);
  if (bottledProducts.length === 0) {
    return null;
  }

  const columnMap = new Map<string, BottledPackColumn>();
  for (const product of bottledProducts) {
    const pack = detectBottledPack(product);
    const stockUnits = sum(
      stockMetrics
        .filter((metric) => metric.productId === product.productId)
        .map((metric) => metric.qty),
    );
    const existing = columnMap.get(pack.id);
    if (existing) {
      existing.units += stockUnits;
    } else {
      columnMap.set(pack.id, { ...pack, units: stockUnits });
    }
  }

  const columns = BOTTLED_PACK_ORDER.filter((packId) => columnMap.has(packId)).map(
    (packId) => columnMap.get(packId)!,
  );
  if (columns.length === 0) {
    return null;
  }

  const unitCounts = columns.map((column) => column.units);
  const litres = columns.map((column) => column.units * column.litresPerUnit);
  const kgs = litres.map((litre) => litre * PALM_OIL_KG_PER_LITRE);
  const totalKgs = sum(kgs);

  return {
    sectionNo,
    title: category.productCat.toUpperCase(),
    columns,
    unitCounts,
    litres,
    kgs,
    totalKgs,
  };
}

export function getStockCommitmentReport(
  userId?: string | null,
): StockCommitmentReport {
  const settings = loadReportCompanySettings(userId);
  const salesPoints = loadSalesPoints();
  const categories = loadCategories();
  const products = loadProducts();
  const stockMetrics = loadStockMetrics();
  const commitmentMetrics = loadCommitmentMetrics();

  const looseCategories = categories.filter((category) => category.isBottled !== 1);
  const bottledCategory = categories.find((category) => category.isBottled === 1) ?? null;

  const sections: StockCommitmentReportSection[] = [];
  let sectionNo = 1;

  for (const category of looseCategories) {
    const categoryProducts = products
      .filter((product) => product.productCatId === category.productCatId)
      .sort((left, right) => left.productName.localeCompare(right.productName));

    for (const product of categoryProducts) {
      sections.push(
        buildProductSection(
          sectionNo,
          product,
          salesPoints,
          stockMetrics,
          commitmentMetrics,
        ),
      );
      sectionNo += 1;
    }
  }

  const bottledSection = bottledCategory
    ? buildBottledSection(sectionNo, bottledCategory, products, stockMetrics)
    : null;

  const { asAtIso } = resolveReportAsAt();

  return {
    settings,
    asAtIso,
    generatedAtIso: nowIso(),
    sections,
    bottledSection,
  };
}
