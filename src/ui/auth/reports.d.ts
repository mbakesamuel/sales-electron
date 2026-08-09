export declare function getAuthenticatedReports(): {
    getStockCommitment: () => Promise<import("../../shared/reports.types.ts").StockCommitmentReport>;
    getStockReport: () => Promise<import("../../shared/reports.types.ts").StockReport>;
    getCommitmentReport: () => Promise<import("../../shared/reports.types.ts").CommitmentReport>;
    getBottleOilStockSales: () => Promise<import("../../shared/reports.types.ts").BottleOilStockSalesReport>;
    getBottledWeeklyIssues: (estimateBasis?: import("../../shared/reports.types.ts").BottledWeeklyEstimateBasis, weekMondayIso?: string) => Promise<import("../../shared/reports.types.ts").BottledWeeklyIssuesReport>;
    getWeekChoices: () => Promise<{
        asAtIso: string;
        weekChoices: import("../../shared/reports.types.ts").WeeklyDeliveriesWeekChoice[];
        defaultWeekMondayIso: string | null;
    }>;
    getWeeklyDeliveries: (weekMondayIso?: string) => Promise<import("../../shared/reports.types.ts").WeeklyDeliveriesReport>;
    getMonthlyDelivery: (half: 1 | 2) => Promise<import("../../shared/reports.types.ts").MonthlyDeliveryReport>;
    getMonthlyStockReconciliation: () => Promise<import("../../shared/reports.types.ts").MonthlyStockReconciliationReport>;
    getMonthlyPaymentDelivery: () => Promise<import("../../shared/reports.types.ts").MonthlyPaymentDeliveryReport>;
    getMonthlyDeliveriesByDestination: () => Promise<import("../../shared/reports.types.ts").MonthlyDeliveriesByDestinationReport>;
    getSalesBudgetMonthlyCrosstab: (reportYear?: number) => Promise<import("../../shared/reports.types.ts").SalesBudgetMonthlyCrosstabReport>;
    getSalesBudgetWeeklyCrosstab: (reportYear?: number) => Promise<import("../../shared/reports.types.ts").SalesBudgetWeeklyCrosstabReport>;
    getDailySales: (reportDateIso: string, salesPointId?: number | null) => Promise<import("../../shared/reports.types.ts").DailySalesReport>;
    saveReportComments: (input: {
        reportId: string;
        text: string | null;
    }) => Promise<{
        ok: true;
        comments: string | null;
    } | {
        ok: false;
        error: string;
    }>;
    listSignatories: () => Promise<import("../../shared/reports.types.ts").ReportSignatoryRow[]>;
    getSignatory: (asAtIso?: string | null) => Promise<{
        name: string;
        title: string;
    }>;
    upsertSignatory: (input: {
        id?: string | null;
        name: string;
        title: string;
        effectiveFrom: string;
    }) => Promise<{
        ok: true;
        row: import("../../shared/reports.types.ts").ReportSignatoryRow;
    } | {
        ok: false;
        error: string;
    }>;
    deleteSignatory: (id: string) => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>;
};
