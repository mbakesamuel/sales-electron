import { getDatabase } from "../db/index.js";
import {
  CAL_MONTHS,
  calendarMonthToFiscal,
  normalizeFiscalMonthPercents,
} from "../../shared/salesBudgetPhase.js";
import { parseQty } from "./shared.js";

export interface FiscalYearPeriodRow {
  financialYear: number;
  startDate: string;
  endDate: string;
}

export interface ProductRow {
  productId: number;
  productName: string;
  productCode: string | null;
}

export interface BudgetRow {
  financialYear: number;
  productId: number;
  annualQtyKg: number;
  budgetUnitPricePerKg: number;
}

export interface SalesBudgetCrosstabContext {
  fiscalYearStartMonth: number;
  periodsByFy: Map<number, FiscalYearPeriodRow>;
  yearChoices: number[];
  reportYear: number;
  productsInReport: ProductRow[];
  budgetMap: Map<string, BudgetRow>;
  phasePctByProductFy: Map<string, number[]>;
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

  const products = db
    .prepare(
      `SELECT productId, productName, productCode
       FROM Product
       ORDER BY productName ASC`,
    )
    .all() as ProductRow[];

  const budgets = db
    .prepare(
      `SELECT financialYear, productId, annualQtyKg, budgetUnitPricePerKg
       FROM ProductSalesBudget`,
    )
    .all() as Array<{
    financialYear: number;
    productId: number;
    annualQtyKg: string;
    budgetUnitPricePerKg: string;
  }>;

  const budgetMap = new Map<string, BudgetRow>();
  const productIdsWithBudget = new Set<number>();
  for (const budget of budgets) {
    budgetMap.set(`${budget.productId}:${budget.financialYear}`, {
      financialYear: budget.financialYear,
      productId: budget.productId,
      annualQtyKg: parseQty(budget.annualQtyKg),
      budgetUnitPricePerKg: parseQty(budget.budgetUnitPricePerKg),
    });
    productIdsWithBudget.add(budget.productId);
  }

  const productsInReport = products.filter((product) =>
    productIdsWithBudget.has(product.productId),
  );

  const phasePctByProductFy = new Map<string, number[]>();
  const pairSeen = new Set<string>();
  const pairList: Array<{ productId: number; financialYear: number }> = [];

  for (const product of productsInReport) {
    for (const month of CAL_MONTHS) {
      const { financialYear } = calendarMonthToFiscal(
        reportYear,
        month,
        fiscalYearStartMonth,
      );
      if (!budgetMap.has(`${product.productId}:${financialYear}`)) {
        continue;
      }
      const pairKey = `${product.productId}:${financialYear}`;
      if (pairSeen.has(pairKey)) {
        continue;
      }
      pairSeen.add(pairKey);
      pairList.push({ productId: product.productId, financialYear });
    }
  }

  const profileRows = db
    .prepare(
      `SELECT productId, financialYear, pctM01, pctM02, pctM03, pctM04, pctM05, pctM06,
              pctM07, pctM08, pctM09, pctM10, pctM11, pctM12
       FROM ProductSalesBudgetMonthPhaseProfile`,
    )
    .all() as Array<Record<string, unknown>>;

  const profileByPair = new Map<string, Record<string, unknown>>();
  for (const row of profileRows) {
    profileByPair.set(`${row.productId}:${row.financialYear}`, row);
  }

  const equalSplit = Array.from({ length: 12 }, () => 1 / 12);
  for (const pair of pairList) {
    const pairKey = `${pair.productId}:${pair.financialYear}`;
    const row = profileByPair.get(pairKey);
    phasePctByProductFy.set(pairKey, row ? profileRowToPercents(row) : equalSplit);
  }

  return {
    fiscalYearStartMonth,
    periodsByFy,
    yearChoices,
    reportYear,
    productsInReport,
    budgetMap,
    phasePctByProductFy,
    hasAnyBudget: budgets.length > 0,
  };
}

export function productLabel(product: ProductRow): string {
  const code = product.productCode ? ` (${product.productCode})` : "";
  return `${product.productName}${code}`;
}
