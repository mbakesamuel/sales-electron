export type FinancialPeriodStatus = "OPEN" | "CLOSED";

export interface FinancialYearRow {
  id: string;
  financialYear: number;
  status: FinancialPeriodStatus;
  openedAt: string | null;
  closedAt: string | null;
  startDate: string;
  endDate: string;
  openMonthCount: number;
  monthCount: number;
}

export interface FinancialMonthRow {
  id: string;
  financialYearPeriodId: string;
  financialYear: number;
  calendarMonth: number;
  name: string;
  status: FinancialPeriodStatus;
  openedAt: string | null;
  closedAt: string | null;
}

export interface OpenPostingPeriod {
  financialYearPeriodId: string;
  financialYear: number;
  monthId: string;
  calendarMonth: number;
  monthName: string;
  startDate: string;
  endDate: string;
}

export interface OpenYearResult {
  year: FinancialYearRow;
  months: FinancialMonthRow[];
}
