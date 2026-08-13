import type {
  MonthlyPalmOilSalesCell,
  MonthlyPalmOilSalesMonthColumn,
  MonthlyPalmOilSalesReport,
  MonthlyPalmOilSalesRow,
} from "../../shared/reports.types.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import { getDatabase } from "../db/index.js";
import {
  loadReportComments,
  loadReportCompanySettings,
} from "./companySettings.js";
import {
  PALM_OIL_KG_PER_LITRE,
  detectBottledPack,
  loadProducts,
  nowIso,
  parseQty,
  sum,
  type ProductRow,
} from "./shared.js";

const ROUTE_ID = "monthly-palm-oil-sales-report";

const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

const LPO_DESTINATION_ROWS = [
  { id: "industries", label: "INDUSTRIES" },
  { id: "wholesales", label: "WHOLESALES" },
  { id: "retail", label: "RETAIL" },
  { id: "cdcWorkers", label: "CDC WORKERS" },
  { id: "makoko", label: "MAKOKO FARMS" },
] as const;

type DestinationId = (typeof LPO_DESTINATION_ROWS)[number]["id"];

interface SaleLineRecord {
  dateIssued: string;
  saleDisposition: string | null;
  customerName: string;
  customerTypeCode: string;
  customerTypeName: string;
  productId: number;
  isMain: number;
  isBottled: number;
  qtyKg: number;
  qtyUnits: number | null;
  lineNet: number;
}

function emptyCell(): MonthlyPalmOilSalesCell {
  return { tons: 0, value: 0 };
}

function emptyMonthCells(): MonthlyPalmOilSalesCell[] {
  return Array.from({ length: 12 }, () => emptyCell());
}

function kgToTons(kg: number): number {
  return kg / 1000;
}

function addCell(target: MonthlyPalmOilSalesCell, tons: number, value: number): void {
  target.tons += tons;
  target.value += value;
}

function sumCells(cells: MonthlyPalmOilSalesCell[]): MonthlyPalmOilSalesCell {
  return {
    tons: sum(cells.map((cell) => cell.tons)),
    value: sum(cells.map((cell) => cell.value)),
  };
}

function sumRowMonths(rows: MonthlyPalmOilSalesRow[]): MonthlyPalmOilSalesCell[] {
  return Array.from({ length: 12 }, (_, monthIndex) => ({
    tons: sum(rows.map((row) => row.months[monthIndex]?.tons ?? 0)),
    value: sum(rows.map((row) => row.months[monthIndex]?.value ?? 0)),
  }));
}

function resolveDestinationId(
  saleDisposition: string | null,
  customerName: string,
  customerTypeCode: string,
  customerTypeName: string,
): DestinationId {
  if (saleDisposition === "RATION") {
    return "cdcWorkers";
  }

  const text = `${customerName} ${customerTypeCode} ${customerTypeName}`.toUpperCase();
  if (text.includes("MAKOKO")) {
    return "makoko";
  }
  if (text.includes("STAFF") || text.includes("WORKER") || text.includes("RATION")) {
    return "cdcWorkers";
  }
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

function loadSaleLines(yearFromIso: string, yearToIso: string): SaleLineRecord[] {
  return getDatabase()
    .prepare(
      `SELECT s.dateIssued, s.saleDisposition,
              COALESCE(c.name, '') AS customerName,
              COALESCE(ct.code, '') AS customerTypeCode,
              COALESCE(ct.name, '') AS customerTypeName,
              sl.productId,
              COALESCE(pc.isMain, 0) AS isMain,
              COALESCE(pc.isBottled, 0) AS isBottled,
              sl.qtyKg, sl.qtyUnits, sl.lineNet
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
    .all(yearFromIso, yearToIso)
    .map((row) => ({
      dateIssued: String((row as { dateIssued: string }).dateIssued).slice(0, 10),
      saleDisposition: (row as { saleDisposition: string | null }).saleDisposition,
      customerName: String((row as { customerName: string }).customerName ?? ""),
      customerTypeCode: String((row as { customerTypeCode: string }).customerTypeCode ?? ""),
      customerTypeName: String((row as { customerTypeName: string }).customerTypeName ?? ""),
      productId: (row as { productId: number }).productId,
      isMain: (row as { isMain: number }).isMain,
      isBottled: (row as { isBottled: number }).isBottled,
      qtyKg: parseQty((row as { qtyKg: string }).qtyKg),
      qtyUnits: (row as { qtyUnits: string | null }).qtyUnits
        ? parseQty((row as { qtyUnits: string }).qtyUnits)
        : null,
      lineNet: parseQty((row as { lineNet: string }).lineNet),
    }));
}

function lineKg(line: SaleLineRecord, products: ProductRow[]): number {
  if (line.isBottled === 1) {
    const product = products.find((item) => item.productId === line.productId);
    if (!product) {
      return line.qtyUnits ?? line.qtyKg;
    }
    const pack = detectBottledPack(product);
    const units = line.qtyUnits ?? line.qtyKg;
    return units * pack.litresPerUnit * PALM_OIL_KG_PER_LITRE;
  }
  return line.qtyKg;
}

function monthIndexFromIso(iso: string): number {
  return Number.parseInt(iso.slice(5, 7), 10) - 1;
}

function buildMonthColumns(
  financialYear: number,
  fromMonth: number,
  toMonth: number,
): MonthlyPalmOilSalesMonthColumn[] {
  const columns: MonthlyPalmOilSalesMonthColumn[] = [];
  for (let month = fromMonth; month <= toMonth; month += 1) {
    columns.push({
      month,
      label: `${MONTH_NAMES[month - 1]} ${financialYear}`,
    });
  }
  return columns;
}

function makeDataRow(
  id: string,
  label: string,
  months: MonthlyPalmOilSalesCell[],
): MonthlyPalmOilSalesRow {
  return {
    id,
    label,
    kind: "data",
    months,
    ytd: sumCells(months),
  };
}

export function getMonthlyPalmOilSalesReport(
  _userId?: string,
): MonthlyPalmOilSalesReport {
  const { asAtIso, period } = resolveReportAsAt();
  const financialYear = period.financialYear;
  const yearFromIso = `${financialYear}-01-01`;
  const yearToIso = `${financialYear}-12-31`;
  const settings = loadReportCompanySettings(undefined, asAtIso);
  const comments = loadReportComments(ROUTE_ID);
  const products = loadProducts();

  const lines = loadSaleLines(yearFromIso, yearToIso).filter(
    (line) => line.dateIssued <= asAtIso,
  );

  const destinationMonths = new Map<DestinationId, MonthlyPalmOilSalesCell[]>();
  for (const row of LPO_DESTINATION_ROWS) {
    destinationMonths.set(row.id, emptyMonthCells());
  }
  const bpoMonths = emptyMonthCells();

  for (const line of lines) {
    const monthIndex = monthIndexFromIso(line.dateIssued);
    if (monthIndex < 0 || monthIndex > 11) {
      continue;
    }

    const tons = kgToTons(lineKg(line, products));
    const value = line.lineNet;

    if (line.isBottled === 1) {
      addCell(bpoMonths[monthIndex], tons, value);
      continue;
    }

    if (line.isMain !== 1) {
      continue;
    }

    const destination = resolveDestinationId(
      line.saleDisposition,
      line.customerName,
      line.customerTypeCode,
      line.customerTypeName,
    );
    const months = destinationMonths.get(destination);
    if (months) {
      addCell(months[monthIndex], tons, value);
    }
  }

  const destinationRows = LPO_DESTINATION_ROWS.map((row) =>
    makeDataRow(row.id, row.label, destinationMonths.get(row.id) ?? emptyMonthCells()),
  );

  const totalLpoMonths = sumRowMonths(destinationRows);
  const totalLpoRow: MonthlyPalmOilSalesRow = {
    id: "totalLpo",
    label: "TOTAL LPO",
    kind: "subtotal",
    months: totalLpoMonths,
    ytd: sumCells(totalLpoMonths),
  };

  const bpoRow = makeDataRow("bpo", "BOTTLE PALM OIL (BPO)", bpoMonths);

  const grandMonths = Array.from({ length: 12 }, (_, monthIndex) => ({
    tons:
      (totalLpoMonths[monthIndex]?.tons ?? 0) + (bpoMonths[monthIndex]?.tons ?? 0),
    value:
      (totalLpoMonths[monthIndex]?.value ?? 0) + (bpoMonths[monthIndex]?.value ?? 0),
  }));
  const grandTotalRow: MonthlyPalmOilSalesRow = {
    id: "grandTotal",
    label: "GRAND TOTAL",
    kind: "total",
    months: grandMonths,
    ytd: sumCells(grandMonths),
  };

  const lpoHeaderRow: MonthlyPalmOilSalesRow = {
    id: "lpoHeader",
    label: "LOOSE PALM OIL (LPO)",
    kind: "section",
    months: emptyMonthCells(),
    ytd: emptyCell(),
  };

  const monthName = period.monthName.toUpperCase();
  const reportTitle = `MONTHLY PALM OIL SALES FOR ${monthName} ${financialYear} (IN TONS AND '000 FRS) TAXES EXCLUDED`;

  return {
    settings,
    asAtIso,
    monthName: period.monthName,
    financialYear,
    reportTitle,
    generatedAtIso: nowIso(),
    monthColumnsH1: buildMonthColumns(financialYear, 1, 7),
    monthColumnsH2: buildMonthColumns(financialYear, 8, 12),
    rows: [lpoHeaderRow, ...destinationRows, totalLpoRow, bpoRow, grandTotalRow],
    comments,
  };
}
