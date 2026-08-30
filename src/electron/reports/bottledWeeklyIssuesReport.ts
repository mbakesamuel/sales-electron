import type {
  BottledWeeklyCompareSection,
  BottledWeeklyDayColumn,
  BottledWeeklyDetailSection,
  BottledWeeklyEstimateBasis,
  BottledWeeklyIssuesReport,
  BottledWeeklyMethodBlock,
  BottledWeeklyMethodMetricRow,
  BottledWeeklyPaymentMethod,
  BottledWeeklySummaryRow,
  BottledWeeklySummarySection,
} from "../../shared/reports.types.js";
import { getDatabase } from "../db/index.js";
import { resolveReportAsAt } from "../financialYears/service.js";
import { loadReportCompanySettings, loadReportComments } from "./companySettings.js";
import {
  PALM_OIL_KG_PER_LITRE,
  detectBottledPack,
  loadProducts,
  nowIso,
  parseQty,
  sum,
  type ProductRow,
} from "./shared.js";
import {
  buildBottledWeekdayColumns,
  buildWeekChoices,
  mondayOf,
  parseLocalIso,
  resolveSelectedWeek,
  startOfDay,
  toIsoDate,
} from "./weekChoices.js";

const METHOD_ORDER: BottledWeeklyPaymentMethod[] = ["CASH", "CREDIT", "PRO"];

const METHOD_LABELS: Record<BottledWeeklyPaymentMethod, string> = {
  CASH: "CASH",
  CREDIT: "CREDIT",
  PRO: "PRO",
};

const ESTIMATE_BASIS_LABELS: Record<BottledWeeklyEstimateBasis, string> = {
  "working-days": "Working days (Mon–Fri)",
  "iso-week": "Full ISO week",
};

export function normalizeBottledWeeklyEstimateBasis(
  value: unknown,
): BottledWeeklyEstimateBasis {
  return value === "iso-week" ? "iso-week" : "working-days";
}

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

interface SaleIssueLine {
  saleId: string;
  dateIssued: string;
  saleDisposition: string | null;
  productId: number;
  units: number;
  lineNet: number;
}

interface SalePaymentShare {
  saleId: string;
  method: BottledWeeklyPaymentMethod;
  share: number;
}

/** Inclusive calendar days in [fromIso, toIso] that fall in calendarYear/calendarMonth. */
function countDaysInCalendarMonth(
  fromIso: string,
  toIso: string,
  calendarYear: number,
  calendarMonth: number,
): number {
  const from = startOfDay(new Date(`${fromIso}T00:00:00`));
  const to = startOfDay(new Date(`${toIso}T00:00:00`));
  if (from > to) {
    return 0;
  }
  let count = 0;
  const cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    if (cursor.getFullYear() === calendarYear && cursor.getMonth() + 1 === calendarMonth) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Week window for ESTM day-share (sales-budget weekly phasing style).
 * working-days: report Mon–Fri window; iso-week: Monday–Sunday of that ISO week.
 */
function estimateWeekWindow(
  weekFromIso: string,
  weekToIso: string,
  basis: BottledWeeklyEstimateBasis,
): { fromIso: string; toIso: string } {
  if (basis === "working-days") {
    return { fromIso: weekFromIso, toIso: weekToIso };
  }
  const monday = startOfDay(new Date(`${weekFromIso}T00:00:00`));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { fromIso: toIsoDate(monday), toIso: toIsoDate(sunday) };
}

function weekEstimateDayFraction(args: {
  weekFromIso: string;
  weekToIso: string;
  calendarYear: number;
  calendarMonth: number;
  basis: BottledWeeklyEstimateBasis;
}): { dayFraction: number; daysInMonth: number; daysInWeekInMonth: number } {
  const daysInMonth = new Date(args.calendarYear, args.calendarMonth, 0).getDate();
  const window = estimateWeekWindow(args.weekFromIso, args.weekToIso, args.basis);
  const daysInWeekInMonth = countDaysInCalendarMonth(
    window.fromIso,
    window.toIso,
    args.calendarYear,
    args.calendarMonth,
  );
  return {
    daysInMonth,
    daysInWeekInMonth,
    dayFraction: daysInMonth > 0 ? daysInWeekInMonth / daysInMonth : 0,
  };
}

function classifyMethod(
  disposition: string | null,
  paymentKind: string | null,
  paymentCode: string | null,
): BottledWeeklyPaymentMethod {
  const kind = (paymentKind ?? "").toUpperCase();
  const code = (paymentCode ?? "").toUpperCase();
  if (code === "PUBLIC_RELATION" || kind === "PUBLIC_RELATION") {
    return "PRO";
  }
  if (code === "RATION" || (kind === "CREDIT" && code.includes("RATION"))) {
    return "CREDIT";
  }
  if (disposition === "PUBLIC_RELATION") {
    return "PRO";
  }
  if (disposition === "RATION") {
    return "CREDIT";
  }
  if (kind === "CREDIT" || code.includes("CREDIT")) {
    return "CREDIT";
  }
  return "CASH";
}

function loadBottledIssueLines(fromIso: string, toIso: string): SaleIssueLine[] {
  return getDatabase()
    .prepare(
      `SELECT s.id AS saleId, s.dateIssued, s.saleDisposition, sl.productId,
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
    .all(fromIso, toIso)
    .map((row) => ({
      saleId: String((row as { saleId: string }).saleId),
      dateIssued: String((row as { dateIssued: string }).dateIssued).slice(0, 10),
      saleDisposition: (row as { saleDisposition: string | null }).saleDisposition,
      productId: (row as { productId: number }).productId,
      units: parseQty((row as { units: string | number }).units),
      lineNet: parseQty((row as { lineNet: string }).lineNet),
    }));
}

function loadPaymentShares(saleIds: string[]): Map<string, SalePaymentShare[]> {
  const result = new Map<string, SalePaymentShare[]>();
  if (saleIds.length === 0) {
    return result;
  }

  const placeholders = saleIds.map(() => "?").join(", ");
  const rows = getDatabase()
    .prepare(
      `SELECT pay.saleId, pay.amount, pm.kind, pm.code
       FROM Payment pay
       INNER JOIN PaymentMethodDefinition pm ON pm.id = pay.paymentMethodId
       WHERE pay.saleId IN (${placeholders})`,
    )
    .all(...saleIds) as Array<{
    saleId: string;
    amount: string;
    kind: string;
    code: string;
  }>;

  const bySale = new Map<string, Array<{ method: BottledWeeklyPaymentMethod; amount: number }>>();
  for (const row of rows) {
    const method = classifyMethod(null, row.kind, row.code);
    const list = bySale.get(row.saleId) ?? [];
    list.push({ method, amount: Math.abs(parseQty(row.amount)) });
    bySale.set(row.saleId, list);
  }

  for (const [saleId, payments] of bySale) {
    const total = sum(payments.map((payment) => payment.amount));
    if (total <= 0) {
      result.set(saleId, [{ saleId, method: "CASH", share: 1 }]);
      continue;
    }
    const merged = new Map<BottledWeeklyPaymentMethod, number>();
    for (const payment of payments) {
      merged.set(payment.method, (merged.get(payment.method) ?? 0) + payment.amount / total);
    }
    result.set(
      saleId,
      [...merged.entries()].map(([method, share]) => ({ saleId, method, share })),
    );
  }

  return result;
}

function unitsToKg(units: number, litresPerUnit: number): number {
  return units * litresPerUnit * PALM_OIL_KG_PER_LITRE;
}

function emptyMetricRow(
  kind: "kgs" | "value",
  dayCount: number,
): BottledWeeklyMethodMetricRow {
  return {
    kind,
    label: kind === "kgs" ? "KGS" : "VALUE FCFA",
    dayValues: Array.from({ length: dayCount }, () => 0),
    weekTotal: 0,
    weekValue: 0,
    monthToDateKg: 0,
    monthToDateValue: 0,
  };
}

function accumulateLine(
  target: Map<BottledWeeklyPaymentMethod, { kgs: BottledWeeklyMethodMetricRow; value: BottledWeeklyMethodMetricRow }>,
  method: BottledWeeklyPaymentMethod,
  dayIndex: number | null,
  kg: number,
  value: number,
  scope: "week" | "month",
): void {
  const block = target.get(method);
  if (!block) {
    return;
  }
  if (scope === "week" && dayIndex != null) {
    block.kgs.dayValues[dayIndex] += kg;
    block.value.dayValues[dayIndex] += value;
    block.kgs.weekTotal += kg;
    block.value.weekTotal += value;
    block.kgs.weekValue += value;
    block.value.weekValue += value;
  }
  if (scope === "month") {
    block.kgs.monthToDateKg += kg;
    block.kgs.monthToDateValue += value;
    block.value.monthToDateKg += kg;
    block.value.monthToDateValue += value;
  }
}

function buildMethodBlocks(
  dayColumns: BottledWeeklyDayColumn[],
  weekLines: SaleIssueLine[],
  monthLines: SaleIssueLine[],
  products: ProductRow[],
  paymentShares: Map<string, SalePaymentShare[]>,
): BottledWeeklyMethodBlock[] {
  const dayIndexByIso = new Map(dayColumns.map((column, index) => [column.isoDate, index]));
  const packByProduct = new Map(
    products
      .filter((product) => product.isBottled === 1)
      .map((product) => [product.productId, detectBottledPack(product)]),
  );

  const metrics = new Map<
    BottledWeeklyPaymentMethod,
    { kgs: BottledWeeklyMethodMetricRow; value: BottledWeeklyMethodMetricRow }
  >();
  for (const method of METHOD_ORDER) {
    metrics.set(method, {
      kgs: emptyMetricRow("kgs", dayColumns.length),
      value: emptyMetricRow("value", dayColumns.length),
    });
  }

  function resolveShares(line: SaleIssueLine): SalePaymentShare[] {
    const shares = paymentShares.get(line.saleId);
    if (shares && shares.length > 0) {
      return shares;
    }
    if (line.saleDisposition === "PUBLIC_RELATION") {
      return [{ saleId: line.saleId, method: "PRO", share: 1 }];
    }
    if (line.saleDisposition === "RATION") {
      return [{ saleId: line.saleId, method: "CREDIT", share: 1 }];
    }
    return [{ saleId: line.saleId, method: "CASH", share: 1 }];
  }

  function applyLines(lines: SaleIssueLine[], scope: "week" | "month") {
    for (const line of lines) {
      const pack = packByProduct.get(line.productId);
      if (!pack) {
        continue;
      }
      const kg = unitsToKg(line.units, pack.litresPerUnit);
      const dayIndex = scope === "week" ? (dayIndexByIso.get(line.dateIssued) ?? null) : null;
      if (scope === "week" && dayIndex == null) {
        continue;
      }
      for (const share of resolveShares(line)) {
        accumulateLine(
          metrics,
          share.method,
          dayIndex,
          kg * share.share,
          line.lineNet * share.share,
          scope,
        );
      }
    }
  }

  applyLines(weekLines, "week");
  applyLines(monthLines, "month");

  return METHOD_ORDER.map((method) => {
    const pair = metrics.get(method)!;
    return {
      method,
      label: METHOD_LABELS[method],
      rows: [pair.kgs, pair.value],
    };
  });
}

function buildTotals(
  methods: BottledWeeklyMethodBlock[],
  dayCount: number,
): BottledWeeklyMethodMetricRow[] {
  const kgs = emptyMetricRow("kgs", dayCount);
  const value = emptyMetricRow("value", dayCount);
  for (const method of methods) {
    const kgRow = method.rows[0];
    const valueRow = method.rows[1];
    for (let index = 0; index < dayCount; index += 1) {
      kgs.dayValues[index] += kgRow.dayValues[index] ?? 0;
      value.dayValues[index] += valueRow.dayValues[index] ?? 0;
    }
    kgs.weekTotal += kgRow.weekTotal;
    kgs.weekValue += kgRow.weekValue;
    kgs.monthToDateKg += kgRow.monthToDateKg;
    kgs.monthToDateValue += kgRow.monthToDateValue;
    value.weekTotal += valueRow.weekTotal;
    value.weekValue += valueRow.weekValue;
    value.monthToDateKg += valueRow.monthToDateKg;
    value.monthToDateValue += valueRow.monthToDateValue;
  }
  return [kgs, value];
}

function loadBottledBudgetEstimate(args: {
  year: number;
  fromMonth: number;
  toMonth: number;
  dayFractionInMonth?: number;
}): { kg: number; value: number } {
  const budgets = getDatabase()
    .prepare(
      `SELECT b.productCatId, b.annualQtyKg, b.budgetUnitPricePerKg
       FROM ProductSalesBudget b
       INNER JOIN ProductCat pc ON pc.productCatId = b.productCatId
       WHERE b.financialYear = ?
         AND COALESCE(pc.isBottled, 0) = 1`,
    )
    .all(args.year) as Array<{
    productCatId: number;
    annualQtyKg: string;
    budgetUnitPricePerKg: string;
  }>;

  if (budgets.length === 0) {
    return { kg: 0, value: 0 };
  }

  const profiles = getDatabase()
    .prepare(
      `SELECT productCatId, pctM01, pctM02, pctM03, pctM04, pctM05, pctM06,
              pctM07, pctM08, pctM09, pctM10, pctM11, pctM12
       FROM ProductSalesBudgetMonthPhaseProfile
       WHERE financialYear = ?`,
    )
    .all(args.year) as Array<Record<string, string | number>>;

  const profileByCat = new Map<number, number[]>();
  for (const profile of profiles) {
    const months = [
      parseQty(profile.pctM01),
      parseQty(profile.pctM02),
      parseQty(profile.pctM03),
      parseQty(profile.pctM04),
      parseQty(profile.pctM05),
      parseQty(profile.pctM06),
      parseQty(profile.pctM07),
      parseQty(profile.pctM08),
      parseQty(profile.pctM09),
      parseQty(profile.pctM10),
      parseQty(profile.pctM11),
      parseQty(profile.pctM12),
    ];
    const total = sum(months);
    profileByCat.set(
      Number(profile.productCatId),
      total > 0 ? months.map((value) => value / total) : Array.from({ length: 12 }, () => 1 / 12),
    );
  }

  let kg = 0;
  let value = 0;
  for (const budget of budgets) {
    const weights =
      profileByCat.get(budget.productCatId) ?? Array.from({ length: 12 }, () => 1 / 12);
    let weight = 0;
    for (let month = args.fromMonth; month <= args.toMonth; month += 1) {
      let monthWeight = weights[month - 1] ?? 0;
      if (
        month === args.toMonth &&
        args.dayFractionInMonth != null &&
        Number.isFinite(args.dayFractionInMonth)
      ) {
        monthWeight *= Math.min(1, Math.max(0, args.dayFractionInMonth));
      }
      weight += monthWeight;
    }
    const annualKg = parseQty(budget.annualQtyKg);
    const unitPrice = parseQty(budget.budgetUnitPricePerKg);
    const periodKg = annualKg * weight;
    kg += periodKg;
    value += periodKg * unitPrice;
  }

  return { kg, value };
}

function metricFromLines(
  lines: SaleIssueLine[],
  products: ProductRow[],
  paymentShares: Map<string, SalePaymentShare[]>,
): { kg: number; value: number } {
  const packByProduct = new Map(
    products
      .filter((product) => product.isBottled === 1)
      .map((product) => [product.productId, detectBottledPack(product)]),
  );
  let kg = 0;
  let value = 0;
  for (const line of lines) {
    const pack = packByProduct.get(line.productId);
    if (!pack) {
      continue;
    }
    const lineKg = unitsToKg(line.units, pack.litresPerUnit);
    const shares =
      paymentShares.get(line.saleId) ??
      (line.saleDisposition === "PUBLIC_RELATION"
        ? [{ method: "PRO" as const, share: 1 }]
        : line.saleDisposition === "RATION"
          ? [{ method: "CREDIT" as const, share: 1 }]
          : [{ method: "CASH" as const, share: 1 }]);
    for (const share of shares) {
      kg += lineKg * share.share;
      value += line.lineNet * share.share;
    }
  }
  return { kg, value };
}

function pct(actual: number, estimate: number): number {
  if (estimate <= 0) {
    return actual > 0 ? 100 : 0;
  }
  return (actual / estimate) * 100;
}

function avgPrice(kg: number, value: number): number | null {
  if (kg <= 0) {
    return null;
  }
  return value / kg;
}

function buildSummary(args: {
  weekActual: { kg: number; value: number };
  monthActual: { kg: number; value: number };
  yearActual: { kg: number; value: number };
  weekEstimate: { kg: number; value: number };
  monthEstimate: { kg: number; value: number };
  yearEstimate: { kg: number; value: number };
}): BottledWeeklySummarySection {
  const rows: BottledWeeklySummaryRow[] = [
    {
      id: "estimate",
      label: "ESTM",
      week: { kgs: args.weekEstimate.kg, value: args.weekEstimate.value },
      monthToDate: { kgs: args.monthEstimate.kg, value: args.monthEstimate.value },
      yearToDate: { kgs: args.yearEstimate.kg, value: args.yearEstimate.value },
      averagePrice: avgPrice(args.weekEstimate.kg, args.weekEstimate.value),
    },
    {
      id: "actual",
      label: "ACTUAL",
      week: { kgs: args.weekActual.kg, value: args.weekActual.value },
      monthToDate: { kgs: args.monthActual.kg, value: args.monthActual.value },
      yearToDate: { kgs: args.yearActual.kg, value: args.yearActual.value },
      averagePrice: avgPrice(args.weekActual.kg, args.weekActual.value),
    },
    {
      id: "pct",
      label: "%TAGE ACHVD",
      week: {
        kgs: pct(args.weekActual.kg, args.weekEstimate.kg),
        value: pct(args.weekActual.value, args.weekEstimate.value),
      },
      monthToDate: {
        kgs: pct(args.monthActual.kg, args.monthEstimate.kg),
        value: pct(args.monthActual.value, args.monthEstimate.value),
      },
      yearToDate: {
        kgs: pct(args.yearActual.kg, args.yearEstimate.kg),
        value: pct(args.yearActual.value, args.yearEstimate.value),
      },
      averagePrice: null,
    },
  ];

  return { title: "SUMMARY", rows };
}

function kgByMethod(
  lines: SaleIssueLine[],
  products: ProductRow[],
  paymentShares: Map<string, SalePaymentShare[]>,
): Record<BottledWeeklyPaymentMethod, number> {
  const result: Record<BottledWeeklyPaymentMethod, number> = {
    CASH: 0,
    CREDIT: 0,
    PRO: 0,
  };
  const packByProduct = new Map(
    products
      .filter((product) => product.isBottled === 1)
      .map((product) => [product.productId, detectBottledPack(product)]),
  );
  for (const line of lines) {
    const pack = packByProduct.get(line.productId);
    if (!pack) {
      continue;
    }
    const lineKg = unitsToKg(line.units, pack.litresPerUnit);
    const shares =
      paymentShares.get(line.saleId) ??
      (line.saleDisposition === "PUBLIC_RELATION"
        ? [{ method: "PRO" as const, share: 1 }]
        : line.saleDisposition === "RATION"
          ? [{ method: "CREDIT" as const, share: 1 }]
          : [{ method: "CASH" as const, share: 1 }]);
    for (const share of shares) {
      result[share.method] += lineKg * share.share;
    }
  }
  return result;
}

function buildCompare(
  currentLabel: string,
  priorLabel: string,
  current: Record<BottledWeeklyPaymentMethod, number>,
  prior: Record<BottledWeeklyPaymentMethod, number>,
): BottledWeeklyCompareSection {
  const currentTotal = sum(METHOD_ORDER.map((method) => current[method]));
  const priorTotal = sum(METHOD_ORDER.map((method) => prior[method]));

  return {
    title: "Payment method mix",
    currentColumn: { id: "current", label: currentLabel },
    priorColumn: { id: "prior", label: priorLabel },
    rows: [
      ...METHOD_ORDER.map((method) => ({
        method,
        label: METHOD_LABELS[method],
        currentKg: current[method],
        currentPct: currentTotal > 0 ? (current[method] / currentTotal) * 100 : 0,
        priorKg: prior[method],
        priorPct: priorTotal > 0 ? (prior[method] / priorTotal) * 100 : 0,
      })),
      {
        method: "TOTAL" as const,
        label: "total KGS",
        currentKg: currentTotal,
        currentPct: currentTotal > 0 ? 100 : 0,
        priorKg: priorTotal,
        priorPct: priorTotal > 0 ? 100 : 0,
      },
    ],
  };
}

export function getBottledWeeklyIssuesReport(
  userId?: string | null,
  estimateBasisRaw?: unknown,
  weekMondayIso?: string | null,
): BottledWeeklyIssuesReport {
  const estimateBasis = normalizeBottledWeeklyEstimateBasis(estimateBasisRaw);
  const { asAtIso, period } = resolveReportAsAt();
  const settings = loadReportCompanySettings(userId, asAtIso);
  const asAt = startOfDay(new Date(`${asAtIso}T00:00:00`));

  const weekChoices = buildWeekChoices(period.startDate, period.endDate, asAtIso);
  const selected =
    resolveSelectedWeek(weekChoices, asAtIso, weekMondayIso) ??
    (() => {
      const monday = mondayOf(parseLocalIso(asAtIso));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fromIso = toIsoDate(monday) < period.startDate ? period.startDate : toIsoDate(monday);
      const toIso = toIsoDate(sunday) > asAtIso ? asAtIso : toIsoDate(sunday);
      return {
        weekMondayIso: toIsoDate(monday),
        weekFromIso: fromIso,
        weekToIso: toIso,
        label: `${fromIso} – ${toIso}`,
      };
    })();

  const weekdayWindow = buildBottledWeekdayColumns(
    selected.weekMondayIso,
    period.startDate,
    selected.weekToIso,
    asAtIso,
  );
  const dayColumns: BottledWeeklyDayColumn[] = weekdayWindow.dayColumns;
  const clippedWeekFrom = weekdayWindow.weekFromIso;
  const clippedWeekTo = weekdayWindow.weekToIso;

  const monthFromIso = period.startDate;
  const yearFromIso = `${period.financialYear}-01-01`;
  const priorYear = period.financialYear - 1;
  const priorMonthFromIso = `${priorYear}-${String(period.calendarMonth).padStart(2, "0")}-01`;
  const lastDayPriorMonth = new Date(priorYear, period.calendarMonth, 0).getDate();
  const asAtDay = Number.parseInt(asAtIso.slice(8, 10), 10);
  const priorDay = Math.min(asAtDay, lastDayPriorMonth);
  const priorMonthToIso = `${priorYear}-${String(period.calendarMonth).padStart(2, "0")}-${String(priorDay).padStart(2, "0")}`;

  const products = loadProducts();
  const rangeFromIso = yearFromIso < priorMonthFromIso ? yearFromIso : priorMonthFromIso;
  const allLines = loadBottledIssueLines(rangeFromIso, asAtIso);
  const saleIds = [...new Set(allLines.map((line) => line.saleId))];
  const paymentShares = loadPaymentShares(saleIds);

  const weekLines = allLines.filter(
    (line) => line.dateIssued >= clippedWeekFrom && line.dateIssued <= clippedWeekTo,
  );
  const monthLines = allLines.filter(
    (line) => line.dateIssued >= monthFromIso && line.dateIssued <= asAtIso,
  );
  const yearLines = allLines.filter(
    (line) => line.dateIssued >= yearFromIso && line.dateIssued <= asAtIso,
  );
  const priorMonthLines = allLines.filter(
    (line) => line.dateIssued >= priorMonthFromIso && line.dateIssued <= priorMonthToIso,
  );

  const methods = buildMethodBlocks(
    dayColumns,
    weekLines,
    monthLines,
    products,
    paymentShares,
  );
  const totals = buildTotals(methods, dayColumns.length);

  const detail: BottledWeeklyDetailSection = {
    monthLabel: MONTH_NAMES[asAt.getMonth()],
    dayColumns,
    methods,
    totals,
  };

  const weekActual = metricFromLines(weekLines, products, paymentShares);
  const monthActual = metricFromLines(monthLines, products, paymentShares);
  const yearActual = metricFromLines(yearLines, products, paymentShares);

  const daysInMonth = new Date(asAt.getFullYear(), asAt.getMonth() + 1, 0).getDate();
  const dayFraction = asAt.getDate() / daysInMonth;
  const weekShare = weekEstimateDayFraction({
    // ISO week expands from the week's Monday through Sunday clip; working days use Mon–Fri.
    weekFromIso: estimateBasis === "iso-week" ? selected.weekFromIso : clippedWeekFrom,
    weekToIso: estimateBasis === "iso-week" ? selected.weekToIso : clippedWeekTo,
    calendarYear: period.financialYear,
    calendarMonth: period.calendarMonth,
    basis: estimateBasis,
  });

  const weekEstimate = loadBottledBudgetEstimate({
    year: period.financialYear,
    fromMonth: period.calendarMonth,
    toMonth: period.calendarMonth,
    dayFractionInMonth: weekShare.dayFraction,
  });
  const monthEstimate = loadBottledBudgetEstimate({
    year: period.financialYear,
    fromMonth: period.calendarMonth,
    toMonth: period.calendarMonth,
    dayFractionInMonth: dayFraction,
  });
  const yearEstimate = loadBottledBudgetEstimate({
    year: period.financialYear,
    fromMonth: 1,
    toMonth: period.calendarMonth,
    dayFractionInMonth: dayFraction,
  });

  const summary = buildSummary({
    weekActual,
    monthActual,
    yearActual,
    weekEstimate,
    monthEstimate,
    yearEstimate,
  });

  const currentMonthShort = `${MONTH_NAMES[period.calendarMonth - 1].slice(0, 3)} ${period.financialYear}`;
  const priorMonthShort = `${MONTH_NAMES[period.calendarMonth - 1].slice(0, 3)} ${priorYear}`;
  const compare = buildCompare(
    currentMonthShort,
    priorMonthShort,
    kgByMethod(monthLines, products, paymentShares),
    kgByMethod(priorMonthLines, products, paymentShares),
  );

  const monthShort = MONTH_NAMES[period.calendarMonth - 1].slice(0, 3);

  return {
    settings,
    asAtIso,
    weekMondayIso: selected.weekMondayIso,
    weekFromIso: clippedWeekFrom,
    weekToIso: clippedWeekTo,
    weekChoices,
    monthFromIso,
    yearFromIso,
    generatedAtIso: nowIso(),
    reportTitle: `BOTTLED PALM OIL: WEEKLY ISSUES ${monthShort} ${period.financialYear}`,
    estimateBasis,
    estimateBasisLabel: ESTIMATE_BASIS_LABELS[estimateBasis],
    estimateWeekDaysInMonth: weekShare.daysInWeekInMonth,
    detail,
    summary,
    compare,
    comments: loadReportComments("bottled-weekly-issues-report"),
  };
}
