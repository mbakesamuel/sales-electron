import type { SalesBudgetWeeklyCrosstabReport } from "../../shared/reports.types.js";
import {
  buildSalesBudgetPhase,
  CAL_MONTHS,
  calendarMonthToFiscal,
  salesBudgetCrosstabCellKey,
  type SalesBudgetPhaseResult,
} from "../../shared/salesBudgetPhase.js";
import { loadReportCompanySettings } from "./companySettings.js";
import {
  loadSalesBudgetCrosstabContext,
  type ProductRow,
} from "./salesBudgetCrosstabShared.js";

export function getSalesBudgetWeeklyCrosstabReport(
  userId?: string | null,
  reportYearRaw?: number | null,
): SalesBudgetWeeklyCrosstabReport {
  const settings = loadReportCompanySettings(userId);
  const context = loadSalesBudgetCrosstabContext(reportYearRaw);
  const phaseResultCache = new Map<string, SalesBudgetPhaseResult | null>();

  function getPhaseResult(productId: number, financialYear: number): SalesBudgetPhaseResult | null {
    const cacheKey = `${productId}:${financialYear}`;
    if (phaseResultCache.has(cacheKey)) {
      return phaseResultCache.get(cacheKey) ?? null;
    }

    const budget = context.budgetMap.get(`${productId}:${financialYear}`);
    const period = context.periodsByFy.get(financialYear);
    const pcts = context.phasePctByProductFy.get(`${productId}:${financialYear}`);
    if (!budget || !period || !pcts) {
      phaseResultCache.set(cacheKey, null);
      return null;
    }

    try {
      const result = buildSalesBudgetPhase({
        financialYear,
        fiscalYearStartMonth: context.fiscalYearStartMonth,
        fyStartIso: period.startDate,
        fyEndIso: period.endDate,
        annualQtyKg: budget.annualQtyKg,
        budgetUnitPricePerKg: budget.budgetUnitPricePerKg,
        fiscalMonthPercents: pcts,
      });
      phaseResultCache.set(cacheKey, result);
      return result;
    } catch {
      phaseResultCache.set(cacheKey, null);
      return null;
    }
  }

  const weekDedup = new Map<
    string,
    { label: string; wy: number; wk: number }
  >();
  const qtyByCell: Array<{ key: string; qtyKg: number }> = [];
  const qtyMap = new Map<string, number>();

  for (const product of context.productsInReport) {
    for (const month of CAL_MONTHS) {
      const { financialYear } = calendarMonthToFiscal(
        context.reportYear,
        month,
        context.fiscalYearStartMonth,
      );
      const phase = getPhaseResult(product.productId, financialYear);
      if (!phase) {
        continue;
      }

      const phaseMonth = phase.months.find(
        (entry) =>
          entry.calendarYear === context.reportYear && entry.calendarMonth === month,
      );
      if (!phaseMonth) {
        continue;
      }

      for (const week of phaseMonth.weeks) {
        const sortKey = `${String(week.isoWeekYear).padStart(4, "0")}-W${String(
          week.isoWeek,
        ).padStart(2, "0")}`;
        if (!weekDedup.has(sortKey)) {
          weekDedup.set(sortKey, {
            label: week.label,
            wy: week.isoWeekYear,
            wk: week.isoWeek,
          });
        }
        const key = salesBudgetCrosstabCellKey(week.label, product.productId, month);
        qtyMap.set(key, week.qtyKg);
        qtyByCell.push({ key, qtyKg: week.qtyKg });
      }
    }
  }

  const sortedWeeks = [...weekDedup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, meta]) => meta);

  const cols: Array<{ productId: number; month: number }> = [];
  for (const product of context.productsInReport) {
    for (const month of CAL_MONTHS) {
      cols.push({ productId: product.productId, month });
    }
  }

  const rowTotals = sortedWeeks.map((week) => {
    let total = 0;
    for (const col of cols) {
      total += qtyMap.get(salesBudgetCrosstabCellKey(week.label, col.productId, col.month)) ?? 0;
    }
    return total;
  });

  const colTotals = cols.map((col) => {
    let total = 0;
    for (const week of sortedWeeks) {
      total += qtyMap.get(salesBudgetCrosstabCellKey(week.label, col.productId, col.month)) ?? 0;
    }
    return total;
  });

  const grandTotal = colTotals.reduce((sum, value) => sum + value, 0);

  const productsInReport: ProductRow[] = context.productsInReport.map((product) => ({
    productId: product.productId,
    productName: product.productName,
    productCode: product.productCode,
  }));

  return {
    settings,
    yearChoices: context.yearChoices,
    reportYear: context.reportYear,
    hasAnyBudget: context.hasAnyBudget,
    productsInReport,
    sortedWeeks,
    cols,
    qtyByCell,
    rowTotals,
    colTotals,
    grandTotal,
    generatedAtIso: new Date().toISOString(),
  };
}
