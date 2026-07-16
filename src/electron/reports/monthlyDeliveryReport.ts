import type {
  MonthlyDeliveryBudgetMetric,
  MonthlyDeliveryBudgetSection,
  MonthlyDeliveryCell,
  MonthlyDeliveryMonthColumn,
  MonthlyDeliveryReport,
  MonthlyDeliveryRow,
  MonthlyDeliverySection,
} from "../../shared/reports.types.js";
import {
  SALES_BUDGET_GROUPS,
  resolveSalesBudgetGroupProductIds,
  type SalesBudgetGroupId,
} from "../../shared/salesBudgetGroups.js";
import { loadReportCompanySettings } from "./companySettings.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import {
  PALM_OIL_KG_PER_LITRE,
  detectBottledPack,
  loadProducts,
  nowIso,
  parseQty,
  sum,
  type ProductRow,
} from "./shared.js";
import { getDatabase } from "../db/index.js";

const MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUNE",
  "JULY",
  "AUG",
  "SEPT",
  "OCT",
  "NOV",
  "DEC",
] as const;

const LOOSE_CUSTOMER_ROWS = [
  { id: "industries", label: "INDUSTRIES" },
  { id: "wholesales", label: "WHOLESALES" },
  { id: "retail", label: "RETAIL" },
  { id: "ration", label: "WORKERS/RATION/PR" },
] as const;

interface CategoryRow {
  productCatId: number;
  productCat: string;
  isMain: number;
  isBottled: number;
}

interface SaleLineRecord {
  dateIssued: string;
  saleDisposition: string | null;
  customerTypeCode: string;
  customerTypeName: string;
  productId: number;
  productName: string;
  productCatId: number;
  isMain: number;
  isBottled: number;
  qtyKg: number;
  qtyUnits: number | null;
  lineNet: number;
}

function emptyCell(): MonthlyDeliveryCell {
  return { tons: 0, value: 0 };
}

function kgToTons(kg: number): number {
  return kg / 1000;
}

function resolveLooseCategoryId(
  saleDisposition: string | null,
  customerTypeCode: string,
  customerTypeName: string,
): (typeof LOOSE_CUSTOMER_ROWS)[number]["id"] {
  // Ration disposition always maps to CDOWORKERS.
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
  // Staff/Worker, unnamed invoice customers, and other types → CDOWORKERS.
  return "ration";
}

function loadCategories(): CategoryRow[] {
  return getDatabase()
    .prepare(
      `SELECT productCatId, productCat, isMain, isBottled
       FROM ProductCat
       ORDER BY isMain DESC, isBottled ASC, productCat ASC`,
    )
    .all() as CategoryRow[];
}

function loadSaleLines(
  yearFromIso: string,
  yearToIso: string,
): SaleLineRecord[] {
  return getDatabase()
    .prepare(
      `SELECT s.dateIssued, s.saleDisposition, ct.code AS customerTypeCode, ct.name AS customerTypeName,
              sl.productId, p.productName, p.productCatId,
              COALESCE(pc.isMain, 0) AS isMain, COALESCE(pc.isBottled, 0) AS isBottled,
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
      dateIssued: String((row as { dateIssued: string }).dateIssued),
      saleDisposition: (row as { saleDisposition: string | null })
        .saleDisposition,
      customerTypeCode: String(
        (row as { customerTypeCode: string | null }).customerTypeCode ?? "",
      ),
      customerTypeName: String(
        (row as { customerTypeName: string | null }).customerTypeName ?? "",
      ),
      productId: (row as { productId: number }).productId,
      productName: String((row as { productName: string }).productName),
      productCatId: (row as { productCatId: number }).productCatId,
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
  return Number.parseInt(iso.slice(5, 7), 10);
}

function buildMonthColumns(
  financialYear: number,
  half: 1 | 2,
): MonthlyDeliveryMonthColumn[] {
  const startMonth = half === 1 ? 1 : 7;
  const endMonth = half === 1 ? 6 : 12;
  const columns: MonthlyDeliveryMonthColumn[] = [];

  for (let month = startMonth; month <= endMonth; month += 1) {
    columns.push({
      month,
      label: `${MONTH_NAMES[month - 1]}, ${financialYear}`,
    });
  }

  return columns;
}

function aggregateLines(
  lines: SaleLineRecord[],
  products: ProductRow[],
  monthColumns: MonthlyDeliveryMonthColumn[],
  predicate: (line: SaleLineRecord) => boolean,
): { months: MonthlyDeliveryCell[]; toDate: MonthlyDeliveryCell } {
  const months = monthColumns.map((column) => {
    const monthLines = lines.filter(
      (line) =>
        predicate(line) && monthIndexFromIso(line.dateIssued) === column.month,
    );
    const kg = sum(monthLines.map((line) => lineKg(line, products)));
    const value = sum(monthLines.map((line) => line.lineNet));
    return { tons: kgToTons(kg), value };
  });

  const allLines = lines.filter(predicate);
  const totalKg = sum(allLines.map((line) => lineKg(line, products)));
  const totalValue = sum(allLines.map((line) => line.lineNet));

  return {
    months,
    toDate: { tons: kgToTons(totalKg), value: totalValue },
  };
}

function sumCells(
  rows: MonthlyDeliveryRow[],
  monthCount: number,
): MonthlyDeliveryCell[] {
  return Array.from({ length: monthCount }, (_, monthIndex) => ({
    tons: sum(rows.map((row) => row.months[monthIndex]?.tons ?? 0)),
    value: sum(rows.map((row) => row.months[monthIndex]?.value ?? 0)),
  }));
}

function sumToDate(rows: MonthlyDeliveryRow[]): MonthlyDeliveryCell {
  return {
    tons: sum(rows.map((row) => row.toDate.tons)),
    value: sum(rows.map((row) => row.toDate.value)),
  };
}

function makeAvgPriceRow(
  label: string,
  totalRow: MonthlyDeliveryRow,
  monthCount: number,
): MonthlyDeliveryRow {
  const months = totalRow.months.map((cell) => ({
    tons: cell.tons,
    value: cell.tons > 0 ? cell.value / (cell.tons * 1000) : 0,
  }));
  const toDateValue =
    totalRow.toDate.tons > 0
      ? totalRow.toDate.value / (totalRow.toDate.tons * 1000)
      : 0;

  return {
    label,
    kind: "avg_price",
    months: months.slice(0, monthCount),
    toDate: { tons: totalRow.toDate.tons, value: toDateValue },
  };
}

function buildMainPalmOilSection(
  sectionNo: number,
  category: CategoryRow,
  lines: SaleLineRecord[],
  products: ProductRow[],
  monthColumns: MonthlyDeliveryMonthColumn[],
): MonthlyDeliverySection {
  const mainLines = lines.filter(
    (line) =>
      line.productCatId === category.productCatId && line.isBottled !== 1,
  );
  const bottledLines = lines.filter((line) => line.isBottled === 1);

  const customerRows: MonthlyDeliveryRow[] = LOOSE_CUSTOMER_ROWS.map((row) => {
    const aggregated = aggregateLines(
      mainLines,
      products,
      monthColumns,
      (line) =>
        resolveLooseCategoryId(
          line.saleDisposition,
          line.customerTypeCode,
          line.customerTypeName,
        ) === row.id,
    );
    return {
      label: row.label,
      kind: "data",
      months: aggregated.months,
      toDate: aggregated.toDate,
    };
  });

  const lpoMonths = sumCells(customerRows, monthColumns.length);
  const lpoToDate = sumToDate(customerRows);
  const lpoRow: MonthlyDeliveryRow = {
    label: "TOTAL L.P.O",
    kind: "subtotal",
    months: lpoMonths,
    toDate: lpoToDate,
  };

  const bpoAggregated = aggregateLines(
    bottledLines,
    products,
    monthColumns,
    () => true,
  );
  const bpoRow: MonthlyDeliveryRow = {
    label: "B.P.O",
    kind: "data",
    months: bpoAggregated.months,
    toDate: bpoAggregated.toDate,
  };

  const grandMonths = lpoMonths.map((cell, index) => ({
    tons: cell.tons + (bpoAggregated.months[index]?.tons ?? 0),
    value: cell.value + (bpoAggregated.months[index]?.value ?? 0),
  }));
  const grandRow: MonthlyDeliveryRow = {
    label: "G.TOTAL P.O",
    kind: "total",
    months: grandMonths,
    toDate: {
      tons: lpoToDate.tons + bpoAggregated.toDate.tons,
      value: lpoToDate.value + bpoAggregated.toDate.value,
    },
  };

  const avgRow = makeAvgPriceRow(
    "AV. SELLG Price / kg",
    grandRow,
    monthColumns.length,
  );

  return {
    sectionNo,
    title: `${sectionNo}. ${category.productCat.toUpperCase()}`,
    rows: [...customerRows, lpoRow, bpoRow, grandRow, avgRow],
  };
}

function buildProductCategorySection(
  sectionNo: number,
  category: CategoryRow,
  categoryProducts: ProductRow[],
  lines: SaleLineRecord[],
  products: ProductRow[],
  monthColumns: MonthlyDeliveryMonthColumn[],
): MonthlyDeliverySection {
  const categoryLines = lines.filter(
    (line) => line.productCatId === category.productCatId,
  );

  const productRows: MonthlyDeliveryRow[] = categoryProducts.map((product) => {
    const aggregated = aggregateLines(
      categoryLines,
      products,
      monthColumns,
      (line) => line.productId === product.productId,
    );
    return {
      label: product.productName.toUpperCase(),
      indent: true,
      kind: "data",
      months: aggregated.months,
      toDate: aggregated.toDate,
    };
  });

  const totalMonths = sumCells(productRows, monthColumns.length);
  const totalRow: MonthlyDeliveryRow = {
    label: "TOTAL",
    kind: "total",
    months: totalMonths,
    toDate: sumToDate(productRows),
  };

  const avgRow = makeAvgPriceRow(
    "AV. SELLG Price / kg",
    totalRow,
    monthColumns.length,
  );

  return {
    sectionNo,
    title: `${sectionNo}. ${category.productCat.toUpperCase()}`,
    rows: [...productRows, totalRow, avgRow],
  };
}

interface BudgetRow {
  productId: number;
  annualQtyKg: number;
  budgetUnitPricePerKg: number;
}

function loadBudgets(financialYear: number): BudgetRow[] {
  return getDatabase()
    .prepare(
      `SELECT productId, annualQtyKg, budgetUnitPricePerKg
       FROM ProductSalesBudget
       WHERE financialYear = ?`,
    )
    .all(financialYear)
    .map((row) => ({
      productId: (row as { productId: number }).productId,
      annualQtyKg: parseQty((row as { annualQtyKg: string }).annualQtyKg),
      budgetUnitPricePerKg: parseQty(
        (row as { budgetUnitPricePerKg: string }).budgetUnitPricePerKg,
      ),
    }));
}

function loadPhaseProfiles(financialYear: number): Map<number, number[]> {
  const rows = getDatabase()
    .prepare(
      `SELECT productId, pctM01, pctM02, pctM03, pctM04, pctM05, pctM06,
              pctM07, pctM08, pctM09, pctM10, pctM11, pctM12
       FROM ProductSalesBudgetMonthPhaseProfile
       WHERE financialYear = ?`,
    )
    .all(financialYear) as Array<Record<string, unknown>>;

  const map = new Map<number, number[]>();
  for (const row of rows) {
    const months = [
      parseQty(row.pctM01 as string),
      parseQty(row.pctM02 as string),
      parseQty(row.pctM03 as string),
      parseQty(row.pctM04 as string),
      parseQty(row.pctM05 as string),
      parseQty(row.pctM06 as string),
      parseQty(row.pctM07 as string),
      parseQty(row.pctM08 as string),
      parseQty(row.pctM09 as string),
      parseQty(row.pctM10 as string),
      parseQty(row.pctM11 as string),
      parseQty(row.pctM12 as string),
    ];
    const total = sum(months);
    // Profiles may be stored as 0-1 fractions or 0-100 percentages.
    const normalized =
      total > 1.5 ? months.map((value) => value / 100) : months;
    map.set(Number(row.productId), normalized);
  }
  return map;
}

function monthWeight(
  productId: number,
  month: number,
  profiles: Map<number, number[]>,
): number {
  const profile = profiles.get(productId);
  if (profile && profile[month - 1] != null) {
    return profile[month - 1]!;
  }
  return 1 / 12;
}

function estimateForProducts(
  productIds: number[],
  months: number[],
  budgets: BudgetRow[],
  profiles: Map<number, number[]>,
): { tons: number; value: number } {
  let kg = 0;
  let value = 0;
  const idSet = new Set(productIds);

  for (const budget of budgets) {
    if (!idSet.has(budget.productId)) {
      continue;
    }
    const weight = sum(
      months.map((month) => monthWeight(budget.productId, month, profiles)),
    );
    const periodKg = budget.annualQtyKg * weight;
    kg += periodKg;
    value += periodKg * budget.budgetUnitPricePerKg;
  }

  return { tons: kgToTons(kg), value };
}

function buildMetricForProducts(input: {
  id: string;
  tonsLabel: string;
  valueLabel: string;
  productIds: number[];
  estimateMonths: number[];
  monthColumns: MonthlyDeliveryMonthColumn[];
  budgets: BudgetRow[];
  profiles: Map<number, number[]>;
  products: ProductRow[];
  lines: SaleLineRecord[];
}): MonthlyDeliveryBudgetMetric {
  const {
    id,
    tonsLabel,
    valueLabel,
    productIds,
    estimateMonths,
    monthColumns,
    budgets,
    profiles,
    products,
    lines,
  } = input;
  const idSet = new Set(productIds);

  const estimate = estimateForProducts(productIds, estimateMonths, budgets, profiles);

  const lineMatches = (line: SaleLineRecord) => idSet.has(line.productId);

  const actual =
    estimateMonths.length === monthColumns.length
      ? aggregateLines(lines, products, monthColumns, lineMatches).toDate
      : (() => {
          const monthSet = new Set(estimateMonths);
          return aggregateLines(
            lines.filter((line) => monthSet.has(monthIndexFromIso(line.dateIssued))),
            products,
            monthColumns.filter((column) => monthSet.has(column.month)),
            lineMatches,
          ).toDate;
        })();

  return {
    id,
    tonsLabel,
    valueLabel,
    estimateTons: estimate.tons,
    actualTons: actual.tons,
    estimateValue: estimate.value,
    actualValue: actual.value,
  };
}

function buildBudgetSections(input: {
  financialYear: number;
  monthColumns: MonthlyDeliveryMonthColumn[];
  asAtIso: string;
  categories: CategoryRow[];
  products: ProductRow[];
  lines: SaleLineRecord[];
}): {
  kernelPkBudgetSection: MonthlyDeliveryBudgetSection;
  budgetSection: MonthlyDeliveryBudgetSection;
} {
  const { financialYear, monthColumns, asAtIso, categories, products, lines } = input;
  const asAtMonth = Number.parseInt(asAtIso.slice(5, 7), 10);
  const asAtYear = Number.parseInt(asAtIso.slice(0, 4), 10);

  const toDateMonths = monthColumns
    .map((column) => column.month)
    .filter((month) => {
      if (asAtYear > financialYear) {
        return true;
      }
      if (asAtYear < financialYear) {
        return false;
      }
      return month <= asAtMonth;
    });

  const estimateMonths =
    toDateMonths.length > 0 ? toDateMonths : monthColumns.map((c) => c.month);
  const budgets = loadBudgets(financialYear);
  const profiles = loadPhaseProfiles(financialYear);

  const metricContext = {
    estimateMonths,
    monthColumns,
    budgets,
    profiles,
    products,
    lines,
  };

  const groupById = new Map(
    SALES_BUDGET_GROUPS.map((group) => [group.id, group] as const),
  );

  const kernelPkMetrics: MonthlyDeliveryBudgetMetric[] = (
    ["uncracked", "cracked"] as const satisfies readonly SalesBudgetGroupId[]
  ).map((id) => {
    const def = groupById.get(id)!;
    return buildMetricForProducts({
      id: def.id,
      tonsLabel: def.tonsLabel,
      valueLabel: def.valueLabel,
      ...metricContext,
      productIds: resolveSalesBudgetGroupProductIds(def.id, categories, products),
    });
  });

  const mainMetrics = (
    ["palm_oil", "bottled_palm_oil", "pko", "pkc"] as const satisfies readonly SalesBudgetGroupId[]
  ).map((id) => {
    const def = groupById.get(id)!;
    return buildMetricForProducts({
      id: def.id,
      tonsLabel: def.tonsLabel,
      valueLabel: def.valueLabel,
      ...metricContext,
      productIds: resolveSalesBudgetGroupProductIds(def.id, categories, products),
    });
  });

  const grandEstimateValue = sum(mainMetrics.map((metric) => metric.estimateValue));
  const grandActualValue = sum(mainMetrics.map((metric) => metric.actualValue));

  return {
    kernelPkBudgetSection: {
      title: `budget ${financialYear}`,
      metrics: kernelPkMetrics,
      grandEstimateValue: 0,
      grandActualValue: 0,
      variance: 0,
    },
    budgetSection: {
      title: `budget ${financialYear}`,
      metrics: mainMetrics,
      grandEstimateValue,
      grandActualValue,
      variance: grandEstimateValue - grandActualValue,
    },
  };
}

export function getMonthlyDeliveryReport(
  half: 1 | 2,
  userId?: string | null,
): MonthlyDeliveryReport {
  const settings = loadReportCompanySettings(userId);
  const { asAtIso, period } = resolveReportAsAt();
  const financialYear = period.financialYear;
  const categories = loadCategories();
  const products = loadProducts();
  const monthColumns = buildMonthColumns(financialYear, half);

  const yearFromIso = `${financialYear}-01-01`;
  const yearToIso = `${financialYear}-12-31`;
  const allLines = loadSaleLines(yearFromIso, yearToIso);

  const halfMonths = new Set(monthColumns.map((column) => column.month));
  const lines = allLines.filter((line) =>
    halfMonths.has(monthIndexFromIso(line.dateIssued)),
  );

  const sections: MonthlyDeliverySection[] = [];
  let sectionNo = 1;

  for (const category of categories) {
    if (category.isBottled === 1) {
      continue;
    }

    if (category.isMain === 1) {
      sections.push(
        buildMainPalmOilSection(
          sectionNo,
          category,
          lines,
          products,
          monthColumns,
        ),
      );
      sectionNo += 1;
      continue;
    }

    const categoryProducts = products.filter(
      (product) => product.productCatId === category.productCatId,
    );
    if (categoryProducts.length === 0) {
      continue;
    }

    sections.push(
      buildProductCategorySection(
        sectionNo,
        category,
        categoryProducts,
        lines,
        products,
        monthColumns,
      ),
    );
    sectionNo += 1;
  }

  const halfLabel = half === 1 ? "JANUARY – JUNE" : "JULY – DECEMBER";
  const { kernelPkBudgetSection, budgetSection } = buildBudgetSections({
    financialYear,
    monthColumns,
    asAtIso,
    categories,
    products,
    lines,
  });

  return {
    settings,
    financialYear,
    half,
    asAtIso,
    generatedAtIso: nowIso(),
    reportTitle: `${financialYear} MONTHLY PALM OIL PRODUCTS DELIVERIES IN TONS AND VALUE TAXES EXCLUDED (${halfLabel})`,
    monthColumns,
    sections,
    kernelPkBudgetSection,
    budgetSection,
  };
}
