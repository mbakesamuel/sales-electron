export declare function getAuthenticatedFinancialYears(): {
    listYears: () => Promise<import("../../shared/financialYears.types.ts").FinancialYearRow[]>;
    openYear: (financialYear: number) => Promise<import("../../shared/financialYears.types.ts").OpenYearResult>;
    closeYear: (periodId: string) => Promise<import("../../shared/financialYears.types.ts").FinancialYearRow>;
    listMonthsForOpenYear: () => Promise<{
        year: import("../../shared/financialYears.types.ts").FinancialYearRow | null;
        months: import("../../shared/financialYears.types.ts").FinancialMonthRow[];
    }>;
    listMonthsForPeriod: (periodId: string) => Promise<import("../../shared/financialYears.types.ts").FinancialMonthRow[]>;
    setMonthStatus: (monthId: string, status: "OPEN" | "CLOSED") => Promise<import("../../shared/financialYears.types.ts").FinancialMonthRow>;
    getOpenPostingPeriod: () => Promise<import("../../shared/financialYears.types.ts").OpenPostingPeriod | null>;
};
