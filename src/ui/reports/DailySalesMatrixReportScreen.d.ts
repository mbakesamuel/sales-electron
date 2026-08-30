import type { DailySalesMatrixReport } from "../../shared/reports.types.ts";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";
import "./DailySalesMatrixReport.css";
export declare function DailySalesMatrixReportDocument({ report, }: {
    report: DailySalesMatrixReport;
}): import("preact").JSX.Element;
export declare function DailySalesMatrixReportScreen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
