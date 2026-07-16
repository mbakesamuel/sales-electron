import type {
  BottleOilSalesColumn,
  BottleOilSalesRow,
  BottleOilSalesSection,
  BottleOilStockMatrixRow,
  BottleOilStockPackColumn,
  BottleOilStockSalesReport,
  BottleOilStockSection,
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

const STOCK_PACK_COLUMNS: Array<
  BottleOilStockPackColumn & { packIds: readonly string[] }
> = [
  {
    id: "carton15",
    unitLabel: "1LX15 CRTN",
    kgLabel: "1L X 15",
    litresPerUnit: 15,
    packIds: ["carton15", "unit1"],
  },
  {
    id: "carton5",
    unitLabel: "3 X 5L CRTN",
    kgLabel: "3 X 5L",
    litresPerUnit: 15,
    packIds: ["carton5"],
  },
  {
    id: "jug20",
    unitLabel: "1X 20L JUG",
    kgLabel: "1X 20L",
    litresPerUnit: 20,
    packIds: ["jug20"],
  },
];

const SALES_COLUMNS: Array<BottleOilSalesColumn & { packIds: readonly string[] }> = [
  { id: "1L", label: "1 L", packIds: ["unit1", "carton15"] },
  { id: "5L", label: "5 L", packIds: ["carton5"] },
  { id: "20L", label: "20 L", packIds: ["jug20"] },
];

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function packIdForProduct(product: ProductRow): string {
  return detectBottledPack(product).id;
}

function salesColumnIndexForPack(packId: string): number {
  const index = SALES_COLUMNS.findIndex((column) => column.packIds.includes(packId));
  return index >= 0 ? index : 0;
}

function stockColumnIndexForPack(packId: string): number {
  const index = STOCK_PACK_COLUMNS.findIndex((column) => column.packIds.includes(packId));
  return index >= 0 ? index : 0;
}

function unitsToKg(units: number, litresPerUnit: number): number {
  return units * litresPerUnit * PALM_OIL_KG_PER_LITRE;
}

function loadBottledStockBalances(): Array<{
  salesPointId: number;
  productId: number;
  qty: number;
}> {
  return getDatabase()
    .prepare(
      `SELECT sb.salesPointId, sb.productId, SUM(CAST(sb.qty AS REAL)) AS qty
       FROM StockBalance sb
       INNER JOIN Product p ON p.productId = sb.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE sb.condition = 'SELLABLE' AND COALESCE(pc.isBottled, 0) = 1
       GROUP BY sb.salesPointId, sb.productId`,
    )
    .all()
    .map((row) => ({
      salesPointId: (row as { salesPointId: number }).salesPointId,
      productId: (row as { productId: number }).productId,
      qty: parseQty((row as { qty: number }).qty),
    }));
}

function buildStockSection(
  salesPoints: SalesPointRow[],
  products: ProductRow[],
  balances: Array<{ salesPointId: number; productId: number; qty: number }>,
  asAtIso: string,
): BottleOilStockSection {
  const bottledProducts = products.filter((product) => product.isBottled === 1);
  const columns = STOCK_PACK_COLUMNS.map(({ packIds: _packIds, ...column }) => column);
  const asAtDate = new Date(`${asAtIso}T00:00:00`);
  const title = `1. BOTTLED PALM OIL STOCKS - AS AT ${asAtDate.toLocaleDateString("en-GB")}`.toUpperCase();

  const dataRows: BottleOilStockMatrixRow[] = salesPoints.map((salesPoint) => {
    const unitCounts = STOCK_PACK_COLUMNS.map(() => 0);
    const kgCounts = STOCK_PACK_COLUMNS.map(() => 0);

    for (const product of bottledProducts) {
      const packId = packIdForProduct(product);
      const columnIndex = stockColumnIndexForPack(packId);
      const units =
        balances.find(
          (balance) =>
            balance.salesPointId === salesPoint.id && balance.productId === product.productId,
        )?.qty ?? 0;
      const column = STOCK_PACK_COLUMNS[columnIndex];
      unitCounts[columnIndex] += units;
      kgCounts[columnIndex] += unitsToKg(units, column.litresPerUnit);
    }

    return {
      salesPointName: salesPoint.name.toUpperCase(),
      unitCounts,
      kgCounts,
      rowTotalUnits: sum(unitCounts),
      rowTotalKg: sum(kgCounts),
      kind: "data",
    };
  });

  const unitColumnTotals = STOCK_PACK_COLUMNS.map((_, columnIndex) =>
    sum(dataRows.map((row) => row.unitCounts[columnIndex])),
  );
  const kgColumnTotals = STOCK_PACK_COLUMNS.map((_, columnIndex) =>
    sum(dataRows.map((row) => row.kgCounts[columnIndex])),
  );
  const grandTotalKg = sum(kgColumnTotals);

  const rows: BottleOilStockMatrixRow[] = [
    ...dataRows,
    {
      salesPointName: "TOTAL",
      unitCounts: unitColumnTotals,
      kgCounts: kgColumnTotals,
      rowTotalUnits: sum(unitColumnTotals),
      rowTotalKg: grandTotalKg,
      kind: "total",
    },
  ];

  return {
    title,
    columns,
    rows,
    unitColumnTotals,
    kgColumnTotals,
    grandTotalKg,
  };
}

interface BottledSaleLine {
  dateIssued: string;
  productId: number;
  units: number;
  lineNet: number;
}

function loadBottledSaleLines(salesFromIso: string, salesToIso: string): BottledSaleLine[] {
  return getDatabase()
    .prepare(
      `SELECT s.dateIssued, sl.productId,
              COALESCE(sl.qtyUnits, sl.qtyKg) AS units, sl.lineNet
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       INNER JOIN Product p ON p.productId = sl.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE s.status = 'VALIDATED'
         AND COALESCE(pc.isBottled, 0) = 1
         AND s.dateIssued >= ?
         AND s.dateIssued <= ?`,
    )
    .all(salesFromIso, salesToIso)
    .map((row) => ({
      dateIssued: String((row as { dateIssued: string }).dateIssued),
      productId: (row as { productId: number }).productId,
      units: parseQty((row as { units: string | number }).units),
      lineNet: parseQty((row as { lineNet: string }).lineNet),
    }));
}

function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(year: number, monthIndex: number): string {
  return `${MONTH_NAMES[monthIndex]}-${String(year).slice(-2)}`;
}

function buildSalesSection(
  products: ProductRow[],
  salesFromIso: string,
  salesToIso: string,
): BottleOilSalesSection {
  const bottledProducts = products.filter((product) => product.isBottled === 1);
  const productPackById = new Map(
    bottledProducts.map((product) => [product.productId, packIdForProduct(product)]),
  );
  const columns = SALES_COLUMNS.map(({ id, label }) => ({ id, label }));
  const saleLines = loadBottledSaleLines(salesFromIso, salesToIso);

  const fromDate = new Date(`${salesFromIso}T00:00:00`);
  const toDate = new Date(`${salesToIso}T00:00:00`);
  const year = fromDate.getFullYear();

  const monthRows: BottleOilSalesRow[] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthStart = new Date(year, monthIndex, 1);
    if (monthStart > toDate) {
      break;
    }

    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const linesForMonth = saleLines.filter((line) => monthKeyFromIso(line.dateIssued) === monthKey);

    const kgs = SALES_COLUMNS.map(() => 0);
    const values = SALES_COLUMNS.map(() => 0);

    for (const line of linesForMonth) {
      const packId = productPackById.get(line.productId);
      if (!packId) {
        continue;
      }
      const columnIndex = salesColumnIndexForPack(packId);
      const stockColumn = STOCK_PACK_COLUMNS[stockColumnIndexForPack(packId)];
      const kg = unitsToKg(line.units, stockColumn.litresPerUnit);
      kgs[columnIndex] += kg;
      values[columnIndex] += line.lineNet;
    }

    monthRows.push({
      label: monthLabel(year, monthIndex),
      kgs,
      values,
      rowTotalKg: sum(kgs),
      rowTotalValue: sum(values),
      kind: "month",
    });
  }

  const totalKgs = SALES_COLUMNS.map((_, columnIndex) =>
    sum(monthRows.map((row) => row.kgs[columnIndex])),
  );
  const totalValues = SALES_COLUMNS.map((_, columnIndex) =>
    sum(monthRows.map((row) => row.values[columnIndex])),
  );
  const grandTotalKg = sum(totalKgs);
  const grandTotalValue = sum(totalValues);

  const percentageKgs = totalKgs.map((kg) => (grandTotalKg > 0 ? (kg / grandTotalKg) * 100 : 0));
  const percentageValues = totalValues.map((value) =>
    grandTotalValue > 0 ? (value / grandTotalValue) * 100 : 0,
  );

  const toDateLabel = toDate.toLocaleDateString("en-GB");
  const title =
    `2. SALES FROM ${fromDate.toLocaleDateString("en-GB")} TO DATE ${toDateLabel}`.toUpperCase();

  const rows: BottleOilSalesRow[] = [
    ...monthRows,
    {
      label: "TOTAL (KGs)",
      kgs: totalKgs,
      values: totalValues,
      rowTotalKg: grandTotalKg,
      rowTotalValue: grandTotalValue,
      kind: "total",
    },
    {
      label: "%TAGE",
      kgs: percentageKgs,
      values: percentageValues,
      rowTotalKg: grandTotalKg > 0 ? 100 : 0,
      rowTotalValue: grandTotalValue > 0 ? 100 : 0,
      kind: "percentage",
    },
    {
      label: "VALUE (FCFA) WITHOUT TAX",
      kgs: totalKgs,
      values: totalValues,
      rowTotalKg: grandTotalKg,
      rowTotalValue: grandTotalValue,
      kind: "value",
    },
    {
      label: "%",
      kgs: percentageKgs,
      values: percentageValues,
      rowTotalKg: grandTotalKg > 0 ? 100 : 0,
      rowTotalValue: grandTotalValue > 0 ? 100 : 0,
      kind: "value_percentage",
    },
  ];

  return {
    title,
    salesFromIso,
    salesToIso,
    columns,
    rows,
  };
}

export function getBottleOilStockSalesReport(
  userId?: string | null,
): BottleOilStockSalesReport {
  const settings = loadReportCompanySettings(userId);
  const salesPoints = loadSalesPoints();
  const products = loadProducts();
  const balances = loadBottledStockBalances();

  const { asAtIso, period } = resolveReportAsAt();
  const salesFromIso = `${period.financialYear}-01-01`;
  const salesToIso = asAtIso;

  return {
    settings,
    asAtIso,
    generatedAtIso: nowIso(),
    stockSection: buildStockSection(salesPoints, products, balances, asAtIso),
    salesSection: buildSalesSection(products, salesFromIso, salesToIso),
  };
}
