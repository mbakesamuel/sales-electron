import type {
  IndustryProductMonthlySalesCell,
  IndustryProductMonthlySalesMonthColumn,
  IndustryProductMonthlySalesReport,
  IndustryProductMonthlySalesRow,
  IndustryProductMonthlySalesSection,
} from "../../shared/reports.types.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import { getDatabase } from "../db/index.js";
import {
  loadReportComments,
  loadReportCompanySettings,
} from "./companySettings.js";
import { loadSalesPoints, nowIso, parseQty, sum } from "./shared.js";

const ROUTE_ID = "industry-product-monthly-sales-report";

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

interface SaleLineRecord {
  dateIssued: string;
  saleDisposition: string | null;
  customerTypeCode: string;
  customerTypeName: string;
  productId: number;
  productName: string;
  isMain: number;
  isBottled: number;
  salesPointId: number | null;
  salesPointName: string;
  qtyKg: number;
  lineNet: number;
}

function emptyCell(): IndustryProductMonthlySalesCell {
  return { tons: 0, value: 0 };
}

function emptyMonthCells(): IndustryProductMonthlySalesCell[] {
  return Array.from({ length: 12 }, () => emptyCell());
}

function kgToTons(kg: number): number {
  return kg / 1000;
}

function addCell(
  target: IndustryProductMonthlySalesCell,
  tons: number,
  value: number,
): void {
  target.tons += tons;
  target.value += value;
}

function sumCells(
  cells: IndustryProductMonthlySalesCell[],
): IndustryProductMonthlySalesCell {
  return {
    tons: sum(cells.map((cell) => cell.tons)),
    value: sum(cells.map((cell) => cell.value)),
  };
}

function sumRowMonths(
  rows: IndustryProductMonthlySalesRow[],
): IndustryProductMonthlySalesCell[] {
  return Array.from({ length: 12 }, (_, monthIndex) => ({
    tons: sum(rows.map((row) => row.months[monthIndex]?.tons ?? 0)),
    value: sum(rows.map((row) => row.months[monthIndex]?.value ?? 0)),
  }));
}

function isIndustryCustomer(
  saleDisposition: string | null,
  customerTypeCode: string,
  customerTypeName: string,
): boolean {
  if (saleDisposition === "RATION") {
    return false;
  }
  const text = `${customerTypeCode} ${customerTypeName}`.toUpperCase();
  return text.includes("INDUSTR");
}

function monthIndexFromIso(iso: string): number {
  return Number.parseInt(iso.slice(5, 7), 10) - 1;
}

function buildMonthColumns(
  financialYear: number,
  fromMonth: number,
  toMonth: number,
): IndustryProductMonthlySalesMonthColumn[] {
  const columns: IndustryProductMonthlySalesMonthColumn[] = [];
  for (let month = fromMonth; month <= toMonth; month += 1) {
    columns.push({
      month,
      label: `${MONTH_NAMES[month - 1]}, ${financialYear}`,
    });
  }
  return columns;
}

function loadSaleLines(yearFromIso: string, yearToIso: string): SaleLineRecord[] {
  return getDatabase()
    .prepare(
      `SELECT s.dateIssued, s.saleDisposition,
              COALESCE(ct.code, '') AS customerTypeCode,
              COALESCE(ct.name, '') AS customerTypeName,
              sl.productId, p.productName,
              COALESCE(pc.isMain, 0) AS isMain,
              COALESCE(pc.isBottled, 0) AS isBottled,
              s.salesPointId,
              COALESCE(sp.name, 'Unassigned') AS salesPointName,
              sl.qtyKg, sl.lineNet
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       INNER JOIN Product p ON p.productId = sl.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       LEFT JOIN Customer c ON c.id = s.customerId
       LEFT JOIN CustomerTypeDefinition ct ON ct.id = c.customerTypeId
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       WHERE s.status = 'VALIDATED'
         AND s.dateIssued >= ?
         AND s.dateIssued <= ?`,
    )
    .all(yearFromIso, yearToIso)
    .map((row) => ({
      dateIssued: String((row as { dateIssued: string }).dateIssued).slice(0, 10),
      saleDisposition: (row as { saleDisposition: string | null }).saleDisposition,
      customerTypeCode: String(
        (row as { customerTypeCode: string }).customerTypeCode ?? "",
      ),
      customerTypeName: String(
        (row as { customerTypeName: string }).customerTypeName ?? "",
      ),
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      isMain: (row as { isMain: number }).isMain,
      isBottled: (row as { isBottled: number }).isBottled,
      salesPointId:
        (row as { salesPointId: number | null }).salesPointId == null
          ? null
          : Number((row as { salesPointId: number }).salesPointId),
      salesPointName: String((row as { salesPointName: string }).salesPointName),
      qtyKg: parseQty((row as { qtyKg: string }).qtyKg),
      lineNet: parseQty((row as { lineNet: string }).lineNet),
    }));
}

export function getIndustryProductMonthlySalesReport(
  userId?: string,
): IndustryProductMonthlySalesReport {
  const { asAtIso, period } = resolveReportAsAt();
  const financialYear = period.financialYear;
  const yearFromIso = `${financialYear}-01-01`;
  const yearToIso = `${financialYear}-12-31`;
  const settings = loadReportCompanySettings(userId, asAtIso);
  const comments = loadReportComments(ROUTE_ID);
  const salesPoints = loadSalesPoints();

  const lines = loadSaleLines(yearFromIso, yearToIso).filter(
    (line) =>
      line.dateIssued <= asAtIso &&
      line.isBottled !== 1 &&
      line.isMain !== 1 &&
      isIndustryCustomer(
        line.saleDisposition,
        line.customerTypeCode,
        line.customerTypeName,
      ),
  );

  const productMap = new Map<number, string>();
  for (const line of lines) {
    if (!productMap.has(line.productId)) {
      productMap.set(line.productId, line.productName);
    }
  }

  const products = [...productMap.entries()]
    .map(([productId, productName]) => ({ productId, productName }))
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const sections: IndustryProductMonthlySalesSection[] = products.map(
    (product) => {
      const spMonths = new Map<string, IndustryProductMonthlySalesCell[]>();
      const spLabels = new Map<string, string>();

      for (const point of salesPoints) {
        const key = String(point.id);
        spMonths.set(key, emptyMonthCells());
        spLabels.set(key, point.name);
      }

      for (const line of lines) {
        if (line.productId !== product.productId) {
          continue;
        }
        const monthIndex = monthIndexFromIso(line.dateIssued);
        if (monthIndex < 0 || monthIndex > 11) {
          continue;
        }
        const key =
          line.salesPointId == null ? "none" : String(line.salesPointId);
        if (!spMonths.has(key)) {
          spMonths.set(key, emptyMonthCells());
          spLabels.set(key, line.salesPointName);
        }
        addCell(
          spMonths.get(key)![monthIndex],
          kgToTons(line.qtyKg),
          line.lineNet,
        );
      }

      const salesPointRows: IndustryProductMonthlySalesRow[] = [...spMonths.entries()]
        .map(([key, months]) => ({
          id: key,
          label: (spLabels.get(key) ?? key).toUpperCase(),
          kind: "data" as const,
          months,
          ytd: sumCells(months),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const totalMonths = sumRowMonths(salesPointRows);
      const totalRow: IndustryProductMonthlySalesRow = {
        id: "total",
        label: "TOTAL",
        kind: "total",
        months: totalMonths,
        ytd: sumCells(totalMonths),
      };

      return {
        productId: product.productId,
        productName: product.productName,
        sectionTitle: `${product.productName.toUpperCase()} MONTHLY SALES FOR ${period.monthName.toUpperCase()} ${financialYear} ( IN TONS AND' 000FRS ) TAXES EXCLUDED.`,
        salesPointRows,
        totalRow,
      };
    },
  );

  const monthName = period.monthName.toUpperCase();
  const reportTitle = `INDUSTRY PRODUCT MONTHLY SALES FOR ${monthName} ${financialYear} (IN TONS AND '000 FRS) TAXES EXCLUDED`;

  return {
    settings,
    asAtIso,
    monthName: period.monthName,
    financialYear,
    reportTitle,
    customerCategoryLabel: "INDUSTRY",
    generatedAtIso: nowIso(),
    monthColumnsH1: buildMonthColumns(financialYear, 1, 7),
    monthColumnsH2: buildMonthColumns(financialYear, 8, 12),
    sections,
    comments,
  };
}
