import { getDatabase } from "../db/index.js";
import {
  CAL_MONTHS,
  calendarMonthToFiscal,
  normalizeFiscalMonthPercents,
} from "../../shared/salesBudgetPhase.js";
import {
  budgetCategoryLabels,
  type SalesBudgetCategoryRef,
} from "../../shared/salesBudgetCategories.js";
import { parseQty } from "./shared.js";

export interface FiscalYearPeriodRow {
  financialYear: number;
  startDate: string;
  endDate: string;
}

/** One budget row in crosstabs — labeled as a product category. */
export interface BudgetCategoryRow {
  productCatId: number;
  label: string;
}

export interface BudgetRow {
  financialYear: number;
  productCatId: number;
  annualQtyKg: number;
  budgetUnitPricePerKg: number;
}

export interface SalesBudgetCrosstabContext {
  fiscalYearStartMonth: number;
  periodsByFy: Map<number, FiscalYearPeriodRow>;
  yearChoices: number[];
  reportYear: number;
  /** Categories with a budget for the report calendar year. */
  categoriesInReport: BudgetCategoryRow[];
  budgetMap: Map<string, BudgetRow>;
  phasePctByCatFy: Map<string, number[]>;
  hasAnyBudget: boolean;
}

function profileRowToPercents(row: Record<string, unknown>): number[] {
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
  return normalizeFiscalMonthPercents(months);
}

export function loadSalesBudgetCrosstabContext(
  reportYearRaw?: number | null,
): SalesBudgetCrosstabContext {
  const db = getDatabase();

  const settingsRow = db
    .prepare(`SELECT fiscalYearStartMonth FROM CompanySettings WHERE id = 'default'`)
    .get() as { fiscalYearStartMonth: number } | undefined;
  const fiscalYearStartMonth = Number(settingsRow?.fiscalYearStartMonth ?? 1);

  const periods = db
    .prepare(
      `SELECT financialYear, startDate, endDate
       FROM FinancialYearPeriod
       ORDER BY financialYear DESC`,
    )
    .all() as Array<{
    financialYear: number;
    startDate: string;
    endDate: string;
  }>;

  const periodsByFy = new Map<number, FiscalYearPeriodRow>();
  for (const period of periods) {
    periodsByFy.set(period.financialYear, {
      financialYear: period.financialYear,
      startDate: String(period.startDate).slice(0, 10),
      endDate: String(period.endDate).slice(0, 10),
    });
  }

  const yearsSet = new Set<number>();
  const yNow = new Date().getFullYear();
  yearsSet.add(yNow);
  for (const period of periods) {
    const sy = Number.parseInt(String(period.startDate).slice(0, 4), 10);
    const ey = Number.parseInt(String(period.endDate).slice(0, 4), 10);
    for (let year = sy; year <= ey; year += 1) {
      yearsSet.add(year);
    }
  }
  const yearChoices = [...yearsSet].sort((a, b) => b - a);

  const reportYear =
    reportYearRaw != null &&
    Number.isFinite(reportYearRaw) &&
    yearChoices.includes(reportYearRaw)
      ? reportYearRaw
      : (yearChoices[0] ?? yNow);

  const categories = db
    .prepare(
      `SELECT productCatId, productCat, COALESCE(isMain, 0) AS isMain,
              COALESCE(isBottled, 0) AS isBottled
       FROM ProductCat
       ORDER BY isMain DESC, isBottled ASC, productCat ASC`,
    )
    .all() as SalesBudgetCategoryRef[];

  const categoryById = new Map(
    categories.map((c) => [c.productCatId, c] as const),
  );

  const budgets = db
    .prepare(
      `SELECT financialYear, productCatId, annualQtyKg, budgetUnitPricePerKg
       FROM ProductSalesBudget`,
    )
    .all() as Array<{
    financialYear: number;
    productCatId: number;
    annualQtyKg: string;
    budgetUnitPricePerKg: string;
  }>;

  const budgetMap = new Map<string, BudgetRow>();
  for (const budget of budgets) {
    budgetMap.set(`${budget.productCatId}:${budget.financialYear}`, {
      financialYear: budget.financialYear,
      productCatId: budget.productCatId,
      annualQtyKg: parseQty(budget.annualQtyKg),
      budgetUnitPricePerKg: parseQty(budget.budgetUnitPricePerKg),
    });
  }

  const financialYearsForReport = new Set<number>();
  for (const month of CAL_MONTHS) {
    financialYearsForReport.add(
      calendarMonthToFiscal(reportYear, month, fiscalYearStartMonth).financialYear,
    );
  }

  const categoriesInReport: BudgetCategoryRow[] = [];
  const seenCatIds = new Set<number>();
  for (const cat of categories) {
    let hasBudget = false;
    for (const fy of financialYearsForReport) {
      if (budgetMap.has(`${cat.productCatId}:${fy}`)) {
        hasBudget = true;
        break;
      }
    }
    if (!hasBudget || seenCatIds.has(cat.productCatId)) {
      continue;
    }
    seenCatIds.add(cat.productCatId);
    categoriesInReport.push({
      productCatId: cat.productCatId,
      label: budgetCategoryLabels(cat).label,
    });
  }

  // Also include orphan budget cats (deleted category edge case) if any.
  for (const budget of budgets) {
    if (seenCatIds.has(budget.productCatId)) continue;
    let coversReport = false;
    for (const fy of financialYearsForReport) {
      if (budget.financialYear === fy) {
        coversReport = true;
        break;
      }
    }
    if (!coversReport) continue;
    seenCatIds.add(budget.productCatId);
    const cat = categoryById.get(budget.productCatId);
    categoriesInReport.push({
      productCatId: budget.productCatId,
      label: cat
        ? budgetCategoryLabels(cat).label
        : `Category ${budget.productCatId}`,
    });
  }

  const phasePctByCatFy = new Map<string, number[]>();
  const pairSeen = new Set<string>();
  const pairList: Array<{ productCatId: number; financialYear: number }> = [];

  for (const cat of categoriesInReport) {
    for (const month of CAL_MONTHS) {
      const { financialYear } = calendarMonthToFiscal(
        reportYear,
        month,
        fiscalYearStartMonth,
      );
      if (!budgetMap.has(`${cat.productCatId}:${financialYear}`)) {
        continue;
      }
      const pairKey = `${cat.productCatId}:${financialYear}`;
      if (pairSeen.has(pairKey)) {
        continue;
      }
      pairSeen.add(pairKey);
      pairList.push({ productCatId: cat.productCatId, financialYear });
    }
  }

  const profileRows = db
    .prepare(
      `SELECT productCatId, financialYear, pctM01, pctM02, pctM03, pctM04, pctM05, pctM06,
              pctM07, pctM08, pctM09, pctM10, pctM11, pctM12
       FROM ProductSalesBudgetMonthPhaseProfile`,
    )
    .all() as Array<Record<string, unknown>>;

  const profileByPair = new Map<string, Record<string, unknown>>();
  for (const row of profileRows) {
    profileByPair.set(`${row.productCatId}:${row.financialYear}`, row);
  }

  const equalSplit = Array.from({ length: 12 }, () => 1 / 12);
  for (const pair of pairList) {
    const pairKey = `${pair.productCatId}:${pair.financialYear}`;
    const row = profileByPair.get(pairKey);
    phasePctByCatFy.set(pairKey, row ? profileRowToPercents(row) : equalSplit);
  }

  return {
    fiscalYearStartMonth,
    periodsByFy,
    yearChoices,
    reportYear,
    categoriesInReport,
    budgetMap,
    phasePctByCatFy,
    hasAnyBudget: budgets.length > 0,
  };
}
