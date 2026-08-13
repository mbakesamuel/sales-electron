export const CAL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function monthName(calendarMonth: number): string {
  return MONTH_NAMES[calendarMonth - 1] ?? "";
}

export function normalizeFiscalMonthPercents(pcts: number[]): number[] {
  const source = pcts.length === 12 ? pcts : Array.from({ length: 12 }, () => 0);
  const total = source.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Array.from({ length: 12 }, () => 1 / 12);
  }

  const asFractions = total > 1.5 ? source.map((value) => value / 100) : [...source];
  const fractionTotal = asFractions.reduce((sum, value) => sum + value, 0);
  if (fractionTotal <= 0) {
    return Array.from({ length: 12 }, () => 1 / 12);
  }
  return asFractions.map((value) => value / fractionTotal);
}

export function fiscalMonthKgFromAnnual(
  annualQtyKg: number,
  pcts: number[],
): number[] {
  const normalized = normalizeFiscalMonthPercents(pcts);
  return normalized.map((pct) => annualQtyKg * pct);
}

export function calendarMonthToFiscal(
  calendarYear: number,
  calendarMonth: number,
  fyStartMonth: number,
): { financialYear: number; financialMonth: number } {
  if (calendarMonth >= fyStartMonth) {
    return {
      financialYear: calendarYear,
      financialMonth: calendarMonth - fyStartMonth + 1,
    };
  }
  return {
    financialYear: calendarYear - 1,
    financialMonth: calendarMonth + 12 - fyStartMonth + 1,
  };
}

export const fiscalPeriodForCalendarMonth = calendarMonthToFiscal;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function daysInCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function dayCountInclusive(startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function clipDateRange(
  startIso: string,
  endIso: string,
  rangeStartIso: string,
  rangeEndIso: string,
): { startIso: string; endIso: string } | null {
  const start = startIso > rangeStartIso ? startIso : rangeStartIso;
  const end = endIso < rangeEndIso ? endIso : rangeEndIso;
  if (start > end) {
    return null;
  }
  return { startIso: start, endIso: end };
}

function fiscalCalendarMonthForIndex(
  financialYear: number,
  fiscalYearStartMonth: number,
  financialMonth: number,
): { calendarYear: number; calendarMonth: number } {
  const zeroBased = fiscalYearStartMonth - 1 + financialMonth - 1;
  const calendarMonth = (zeroBased % 12) + 1;
  const yearOffset = Math.floor(zeroBased / 12);
  return {
    calendarYear: financialYear + yearOffset,
    calendarMonth,
  };
}

export function computeMonthlyBudgetQtyKgByFiscalMonth(args: {
  financialYear: number;
  fiscalYearStartMonth: number;
  fyStartIso: string;
  fyEndIso: string;
  annualQtyKg: number;
  fiscalMonthPercents: number[];
}): number[] {
  const normalized = normalizeFiscalMonthPercents(args.fiscalMonthPercents);
  const line = Array.from({ length: 12 }, () => 0);

  for (let financialMonth = 1; financialMonth <= 12; financialMonth += 1) {
    const { calendarYear, calendarMonth } = fiscalCalendarMonthForIndex(
      args.financialYear,
      args.fiscalYearStartMonth,
      financialMonth,
    );
    const monthStartIso = isoDate(calendarYear, calendarMonth, 1);
    const monthEndIso = isoDate(
      calendarYear,
      calendarMonth,
      daysInCalendarMonth(calendarYear, calendarMonth),
    );
    const clipped = clipDateRange(
      monthStartIso,
      monthEndIso,
      args.fyStartIso,
      args.fyEndIso,
    );
    if (!clipped) {
      continue;
    }

    const daysInMonth = daysInCalendarMonth(calendarYear, calendarMonth);
    const clippedDays = dayCountInclusive(clipped.startIso, clipped.endIso);
    const fraction = clippedDays / daysInMonth;
    line[financialMonth - 1] = args.annualQtyKg * normalized[financialMonth - 1]! * fraction;
  }

  return line;
}

export interface SalesBudgetPhaseWeek {
  label: string;
  isoWeekYear: number;
  isoWeek: number;
  qtyKg: number;
}

export interface SalesBudgetPhaseMonth {
  calendarYear: number;
  calendarMonth: number;
  weeks: SalesBudgetPhaseWeek[];
}

export interface SalesBudgetPhaseResult {
  months: SalesBudgetPhaseMonth[];
}

function getIsoWeekInfo(date: Date): { isoWeekYear: number; isoWeek: number } {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const isoWeekYear = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoWeekYear, 0, 1));
  const isoWeek = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { isoWeekYear, isoWeek };
}

function isoWeekLabel(isoWeekYear: number, isoWeek: number): string {
  return `${isoWeekYear}-W${String(isoWeek).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildSalesBudgetPhase(args: {
  financialYear: number;
  fiscalYearStartMonth: number;
  fyStartIso: string;
  fyEndIso: string;
  annualQtyKg: number;
  budgetUnitPricePerKg: number;
  fiscalMonthPercents: number[];
}): SalesBudgetPhaseResult {
  void args.budgetUnitPricePerKg;

  const fiscalMonthKg = computeMonthlyBudgetQtyKgByFiscalMonth({
    financialYear: args.financialYear,
    fiscalYearStartMonth: args.fiscalYearStartMonth,
    fyStartIso: args.fyStartIso,
    fyEndIso: args.fyEndIso,
    annualQtyKg: args.annualQtyKg,
    fiscalMonthPercents: args.fiscalMonthPercents,
  });

  const months: SalesBudgetPhaseMonth[] = [];

  for (let financialMonth = 1; financialMonth <= 12; financialMonth += 1) {
    const monthKg = fiscalMonthKg[financialMonth - 1] ?? 0;
    if (monthKg <= 0) {
      continue;
    }

    const { calendarYear, calendarMonth } = fiscalCalendarMonthForIndex(
      args.financialYear,
      args.fiscalYearStartMonth,
      financialMonth,
    );
    const monthStartIso = isoDate(calendarYear, calendarMonth, 1);
    const monthEndIso = isoDate(
      calendarYear,
      calendarMonth,
      daysInCalendarMonth(calendarYear, calendarMonth),
    );
    const monthInFy = clipDateRange(monthStartIso, monthEndIso, args.fyStartIso, args.fyEndIso);
    if (!monthInFy) {
      continue;
    }

    const daysInMonthInFy = dayCountInclusive(monthInFy.startIso, monthInFy.endIso);
    if (daysInMonthInFy <= 0) {
      continue;
    }

    const weekMap = new Map<string, SalesBudgetPhaseWeek>();
    let cursor = parseIsoDate(monthInFy.startIso);
    const monthEnd = parseIsoDate(monthInFy.endIso);
    const kgPerDay = monthKg / daysInMonthInFy;

    while (cursor.getTime() <= monthEnd.getTime()) {
      const { isoWeekYear, isoWeek } = getIsoWeekInfo(cursor);
      const label = isoWeekLabel(isoWeekYear, isoWeek);
      const existing = weekMap.get(label);
      if (existing) {
        existing.qtyKg += kgPerDay;
      } else {
        weekMap.set(label, {
          label,
          isoWeekYear,
          isoWeek,
          qtyKg: kgPerDay,
        });
      }

      cursor = addDays(cursor, 1);
    }

    const weeks = [...weekMap.values()].sort((a, b) => {
      const aKey = `${String(a.isoWeekYear).padStart(4, "0")}-W${String(a.isoWeek).padStart(2, "0")}`;
      const bKey = `${String(b.isoWeekYear).padStart(4, "0")}-W${String(b.isoWeek).padStart(2, "0")}`;
      return aKey.localeCompare(bKey);
    });

    months.push({
      calendarYear,
      calendarMonth,
      weeks,
    });
  }

  return { months };
}

export function formatPhasedQtyKgDisplay(kg: number): string {
  if (!Number.isFinite(kg) || kg === 0) {
    return "—";
  }
  return Math.round(kg).toLocaleString("en-US");
}

export function salesBudgetCrosstabCellKey(
  weekLabel: string,
  productId: number,
  month: number,
): string {
  return `${weekLabel}|||${productId}:${month}`;
}
