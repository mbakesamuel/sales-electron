import type {
  WeeklyDeliveriesBottledSection,
  WeeklyDeliveriesLooseRow,
  WeeklyDeliveriesLooseSection,
  WeeklyDeliveriesMiscRow,
  WeeklyDeliveriesReport,
} from "../../shared/reports.types.js";
import { loadReportCompanySettings } from "./companySettings.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import {
  PALM_OIL_KG_PER_LITRE,
  detectBottledPack,
  loadProducts,
  loadSalesPoints,
  nowIso,
  parseQty,
  sum,
  type ProductRow,
  type SalesPointRow,
} from "./shared.js";
import { getDatabase } from "../db/index.js";

const LOOSE_CATEGORY_ROWS = [
  { id: "industries", label: "INDUSTRIES" },
  { id: "wholesales", label: "WHOLESALES" },
  { id: "retail", label: "RETAIL" },
  { id: "ration", label: "CDC WORKERS (RATION)" },
] as const;

const BOTTLED_DELIVERY_COLUMNS = [
  { id: "jug20", label: "1X20L JUG", litresPerUnit: 20 },
  { id: "carton15", label: "1X15L CTN", litresPerUnit: 15 },
  { id: "carton5", label: "3X5L CTN", litresPerUnit: 15 },
] as const;

interface SaleLineRecord {
  salesPointId: number | null;
  saleDisposition: string | null;
  customerTypeCode: string;
  customerTypeName: string;
  productId: number;
  productName: string;
  isMain: number;
  isBottled: number;
  qtyKg: number;
  qtyUnits: number | null;
}

function getWeekRange(asAt: Date): { weekFromIso: string; weekToIso: string } {
  const day = asAt.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(asAt);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(asAt.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const toDate = asAt < sunday ? asAt : sunday;

  return {
    weekFromIso: monday.toISOString().slice(0, 10),
    weekToIso: toDate.toISOString().slice(0, 10),
  };
}

function resolveLooseCategoryId(
  saleDisposition: string | null,
  customerTypeCode: string,
  customerTypeName: string,
): (typeof LOOSE_CATEGORY_ROWS)[number]["id"] {
  if (saleDisposition === "RATION") {
    return "ration";
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
  return "ration";
}

function loadSaleLines(weekFromIso: string, weekToIso: string): SaleLineRecord[] {
  return getDatabase()
    .prepare(
      `SELECT s.salesPointId, s.saleDisposition, ct.code AS customerTypeCode, ct.name AS customerTypeName,
              sl.productId, p.productName, COALESCE(pc.isMain, 0) AS isMain,
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
    .all(weekFromIso, weekToIso)
    .map((row) => ({
      salesPointId: (row as { salesPointId: number | null }).salesPointId,
      saleDisposition: (row as { saleDisposition: string | null }).saleDisposition,
      customerTypeCode: String((row as { customerTypeCode: string | null }).customerTypeCode ?? ""),
      customerTypeName: String((row as { customerTypeName: string | null }).customerTypeName ?? ""),
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      isMain: (row as { isMain: number }).isMain,
      isBottled: (row as { isBottled: number }).isBottled,
      qtyKg: parseQty((row as { qtyKg: string }).qtyKg),
      qtyUnits: (row as { qtyUnits: string | null }).qtyUnits
        ? parseQty((row as { qtyUnits: string }).qtyUnits)
        : null,
    }));
}

function looseLineKg(line: SaleLineRecord): number {
  return line.qtyKg;
}

function bottledLineUnits(line: SaleLineRecord): number {
  return line.qtyUnits ?? line.qtyKg;
}

function buildLooseSection(
  salesPoints: SalesPointRow[],
  saleLines: SaleLineRecord[],
): WeeklyDeliveriesLooseSection {
  const salesPointNames = salesPoints.map((salesPoint) => salesPoint.name.toUpperCase());
  const looseLines = saleLines.filter((line) => line.isBottled !== 1 && line.isMain === 1);

  const dataRows: WeeklyDeliveriesLooseRow[] = LOOSE_CATEGORY_ROWS.map((category) => {
    const quantities = salesPoints.map((salesPoint) =>
      sum(
        looseLines
          .filter((line) => {
            if (line.salesPointId !== salesPoint.id) {
              return false;
            }
            return (
              resolveLooseCategoryId(
                line.saleDisposition,
                line.customerTypeCode,
                line.customerTypeName,
              ) === category.id
            );
          })
          .map((line) => looseLineKg(line)),
      ),
    );

    return {
      label: category.label,
      quantities,
      rowTotal: sum(quantities),
      kind: "data",
    };
  });

  const columnTotals = salesPoints.map((_, salesPointIndex) =>
    sum(dataRows.map((row) => row.quantities[salesPointIndex])),
  );

  const rows: WeeklyDeliveriesLooseRow[] = [
    ...dataRows,
    {
      label: "TOTAL",
      quantities: columnTotals,
      rowTotal: sum(columnTotals),
      kind: "total",
    },
  ];

  return {
    title: "1) LOOSE PALM OIL",
    salesPointNames,
    rows,
  };
}

function buildBottledSection(
  saleLines: SaleLineRecord[],
  products: ProductRow[],
): WeeklyDeliveriesBottledSection {
  const bottledProducts = products.filter((product) => product.isBottled === 1);
  const productPackById = new Map(
    bottledProducts.map((product) => [product.productId, detectBottledPack(product).id]),
  );
  const bottledLines = saleLines.filter((line) => line.isBottled === 1);

  const unitCounts = BOTTLED_DELIVERY_COLUMNS.map((column) => {
    return sum(
      bottledLines
        .filter((line) => productPackById.get(line.productId) === column.id)
        .map((line) => bottledLineUnits(line)),
    );
  });

  const litres = BOTTLED_DELIVERY_COLUMNS.map(
    (column, index) => unitCounts[index] * column.litresPerUnit,
  );
  const kgs = litres.map((litre) => litre * PALM_OIL_KG_PER_LITRE);
  const totalUnits = sum(unitCounts);
  const totalKgs = sum(kgs);

  return {
    title: "2) BOTTLED PALM OIL",
    columns: BOTTLED_DELIVERY_COLUMNS.map(({ id, label, litresPerUnit }) => ({
      id,
      label,
      litresPerUnit,
    })),
    unitCounts,
    litres,
    kgs,
    totalUnits,
    totalKgs,
  };
}

function buildMiscRows(saleLines: SaleLineRecord[], products: ProductRow[]): WeeklyDeliveriesMiscRow[] {
  const miscProducts = products.filter((product) => product.isBottled !== 1 && product.isMain !== 1);
  const miscLines = saleLines.filter((line) => line.isBottled !== 1 && line.isMain !== 1);

  return miscProducts
    .map((product) => ({
      label: product.productName.toUpperCase(),
      quantityKg: sum(
        miscLines.filter((line) => line.productId === product.productId).map((line) => looseLineKg(line)),
      ),
    }))
    .filter((row) => row.quantityKg > 0)
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getWeeklyDeliveriesReport(
  userId?: string | null,
): WeeklyDeliveriesReport {
  const settings = loadReportCompanySettings(userId);
  const salesPoints = loadSalesPoints();
  const products = loadProducts();

  const { asAtIso, period } = resolveReportAsAt();
  const asAtDate = new Date(`${asAtIso}T00:00:00`);
  const { weekFromIso, weekToIso } = getWeekRange(asAtDate);
  const clippedFrom = weekFromIso < period.startDate ? period.startDate : weekFromIso;
  const clippedTo = weekToIso > asAtIso ? asAtIso : weekToIso;
  const saleLines = loadSaleLines(clippedFrom, clippedTo);

  return {
    settings,
    asAtIso,
    weekFromIso: clippedFrom,
    weekToIso: clippedTo,
    generatedAtIso: nowIso(),
    looseSection: buildLooseSection(salesPoints, saleLines),
    bottledSection: buildBottledSection(saleLines, products),
    miscRows: buildMiscRows(saleLines, products),
  };
}
