import type { DailySalesReport } from "../../shared/reports.types.ts";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";
export declare function DailySalesReportDocument({ report }: {
    report: DailySalesReport;
}): import("preact").JSX.Element;
export declare function DailySalesReportScreen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
