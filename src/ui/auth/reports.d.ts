export declare function getAuthenticatedReports(): {
    getStockCommitment: () => Promise<import("../../shared/reports.types.ts").StockCommitmentReport>;
    getStockReport: () => Promise<import("../../shared/reports.types.ts").StockReport>;
    getCommitmentReport: () => Promise<import("../../shared/reports.types.ts").CommitmentReport>;
    getBottleOilStockSales: () => Promise<import("../../shared/reports.types.ts").BottleOilStockSalesReport>;
    getBottledWeeklyIssues: (estimateBasis?: import("../../shared/reports.types.ts").BottledWeeklyEstimateBasis) => Promise<import("../../shared/reports.types.ts").BottledWeeklyIssuesReport>;
    getWeeklyDeliveries: () => Promise<import("../../shared/reports.types.ts").WeeklyDeliveriesReport>;
    getMonthlyDelivery: (half: 1 | 2) => Promise<import("../../shared/reports.types.ts").MonthlyDeliveryReport>;
    getSalesBudgetMonthlyCrosstab: (reportYear?: number) => Promise<import("../../shared/reports.types.ts").SalesBudgetMonthlyCrosstabReport>;
    getSalesBudgetWeeklyCrosstab: (reportYear?: number) => Promise<import("../../shared/reports.types.ts").SalesBudgetWeeklyCrosstabReport>;
};
