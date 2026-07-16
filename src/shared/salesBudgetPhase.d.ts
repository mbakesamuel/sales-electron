export declare const CAL_MONTHS: readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export declare const MONTH_NAMES: readonly ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export declare function monthName(calendarMonth: number): string;
export declare function normalizeFiscalMonthPercents(pcts: number[]): number[];
export declare function fiscalMonthKgFromAnnual(annualQtyKg: number, pcts: number[]): number[];
export declare function calendarMonthToFiscal(calendarYear: number, calendarMonth: number, fyStartMonth: number): {
    financialYear: number;
    financialMonth: number;
};
export declare const fiscalPeriodForCalendarMonth: typeof calendarMonthToFiscal;
export declare function computeMonthlyBudgetQtyKgByFiscalMonth(args: {
    financialYear: number;
    fiscalYearStartMonth: number;
    fyStartIso: string;
    fyEndIso: string;
    annualQtyKg: number;
    fiscalMonthPercents: number[];
}): number[];
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
export declare function buildSalesBudgetPhase(args: {
    financialYear: number;
    fiscalYearStartMonth: number;
    fyStartIso: string;
    fyEndIso: string;
    annualQtyKg: number;
    budgetUnitPricePerKg: number;
    fiscalMonthPercents: number[];
}): SalesBudgetPhaseResult;
export declare function formatPhasedQtyKgDisplay(kg: number): string;
export declare function salesBudgetCrosstabCellKey(weekLabel: string, productId: number, month: number): string;
