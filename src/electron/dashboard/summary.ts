import type { DashboardSummary } from "../../shared/dashboard.types.js";
import { getDatabase } from "../db/index.js";
import { getOpenPostingPeriod } from "../financialYears/service.js";
import { parseAmount } from "../sales/money.js";

const MONTH_LABELS = [
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

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function localTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

function loadRevenueByDay(fromIso: string, toIso: string): DashboardSummary["revenueByDay"] {
  const rows = getDatabase()
    .prepare(
      `SELECT substr(s.dateIssued, 1, 10) AS dateIso,
              COALESCE(SUM(CAST(s.grossAmount AS REAL)), 0) AS amount
       FROM Sale s
       WHERE s.status = 'VALIDATED'
         AND substr(s.dateIssued, 1, 10) >= ?
         AND substr(s.dateIssued, 1, 10) <= ?
       GROUP BY substr(s.dateIssued, 1, 10)
       ORDER BY dateIso ASC`,
    )
    .all(fromIso, toIso) as Array<{ dateIso: string; amount: number }>;

  return rows.map((row) => ({
    dateIso: row.dateIso,
    amount: Number.isFinite(row.amount) ? row.amount : parseAmount(String(row.amount)),
  }));
}

function loadRevenueByCategory(
  fromIso: string,
  toIso: string,
): DashboardSummary["revenueByCategory"] {
  const rows = getDatabase()
    .prepare(
      `SELECT p.productCatId AS categoryId,
              COALESCE(pc.productCat, 'Uncategorized') AS label,
              COALESCE(SUM(CAST(sl.lineNet AS REAL)), 0) AS amount
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       INNER JOIN Product p ON p.productId = sl.productId
       LEFT JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE s.status = 'VALIDATED'
         AND substr(s.dateIssued, 1, 10) >= ?
         AND substr(s.dateIssued, 1, 10) <= ?
       GROUP BY p.productCatId, COALESCE(pc.productCat, 'Uncategorized')
       HAVING COALESCE(SUM(CAST(sl.lineNet AS REAL)), 0) > 0.0001
       ORDER BY amount DESC`,
    )
    .all(fromIso, toIso) as Array<{
    categoryId: number | null;
    label: string;
    amount: number;
  }>;

  return rows.map((row) => ({
    categoryId: row.categoryId == null ? null : Number(row.categoryId),
    label: String(row.label),
    amount: Number.isFinite(row.amount) ? row.amount : parseAmount(String(row.amount)),
  }));
}

function loadDoQtyByMonth(
  year: number,
  fromIso: string,
  toIso: string,
): Map<number, number> {
  const rows = getDatabase()
    .prepare(
      `SELECT CAST(strftime('%m', substr(d.dateIssued, 1, 10)) AS INTEGER) AS month,
              COALESCE(SUM(CAST(dd.orderQty AS REAL)), 0) AS qty
       FROM DeliveryOrder d
       INNER JOIN DeliveryOrderDetails dd ON dd.deliveryOrderId = d.id
       WHERE d.status = 'VALIDATED'
         AND substr(d.dateIssued, 1, 10) >= ?
         AND substr(d.dateIssued, 1, 10) <= ?
       GROUP BY month`,
    )
    .all(fromIso, toIso) as Array<{ month: number; qty: number }>;

  const map = new Map<number, number>();
  for (const row of rows) {
    if (row.month >= 1 && row.month <= 12) {
      map.set(row.month, Number.isFinite(row.qty) ? row.qty : 0);
    }
  }
  // Keep year unused but available for clarity / future filters.
  void year;
  return map;
}

function loadSalesQtyByMonth(fromIso: string, toIso: string): Map<number, number> {
  const rows = getDatabase()
    .prepare(
      `SELECT CAST(strftime('%m', substr(s.dateIssued, 1, 10)) AS INTEGER) AS month,
              COALESCE(SUM(CAST(sl.qtyKg AS REAL)), 0) AS qty
       FROM Sale s
       INNER JOIN SaleLine sl ON sl.saleId = s.id
       WHERE s.status = 'VALIDATED'
         AND substr(s.dateIssued, 1, 10) >= ?
         AND substr(s.dateIssued, 1, 10) <= ?
       GROUP BY month`,
    )
    .all(fromIso, toIso) as Array<{ month: number; qty: number }>;

  const map = new Map<number, number>();
  for (const row of rows) {
    if (row.month >= 1 && row.month <= 12) {
      map.set(row.month, Number.isFinite(row.qty) ? row.qty : 0);
    }
  }
  return map;
}

export function getDashboardSummary(_userId?: string | null): DashboardSummary {
  const asAtIso = localTodayIso();
  const period = getOpenPostingPeriod();

  if (!period) {
    return {
      hasOpenPeriod: false,
      openMonth: null,
      openYear: null,
      asAtIso,
      revenueByDay: [],
      revenueByCategory: [],
      doVsSalesByMonth: [],
    };
  }

  const monthEnd = minIso(period.endDate, asAtIso);
  const yearStart = `${period.financialYear}-01-01`;
  const yearEnd = minIso(`${period.financialYear}-12-31`, asAtIso);
  const lastMonth =
    asAtIso.slice(0, 4) === String(period.financialYear)
      ? Number.parseInt(asAtIso.slice(5, 7), 10)
      : period.calendarMonth;

  const doByMonth = loadDoQtyByMonth(period.financialYear, yearStart, yearEnd);
  const salesByMonth = loadSalesQtyByMonth(yearStart, yearEnd);
  const doVsSalesByMonth: DashboardSummary["doVsSalesByMonth"] = [];
  for (let month = 1; month <= lastMonth; month += 1) {
    doVsSalesByMonth.push({
      month,
      label: MONTH_LABELS[month - 1] ?? String(month),
      doQtyKg: doByMonth.get(month) ?? 0,
      salesQtyKg: salesByMonth.get(month) ?? 0,
    });
  }

  return {
    hasOpenPeriod: true,
    openMonth: {
      year: period.financialYear,
      month: period.calendarMonth,
      startDate: period.startDate,
      endDate: monthEnd,
      label: `${period.monthName} ${period.financialYear}`,
    },
    openYear: period.financialYear,
    asAtIso,
    revenueByDay: loadRevenueByDay(period.startDate, monthEnd),
    revenueByCategory: loadRevenueByCategory(period.startDate, monthEnd),
    doVsSalesByMonth,
  };
}
