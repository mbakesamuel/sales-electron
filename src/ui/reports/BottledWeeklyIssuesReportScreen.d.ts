import type { BottledWeeklyIssuesReport } from "../../shared/reports.types.ts";
import "./StockCommitmentReport.css";
import "./BottledWeeklyIssuesReport.css";
import "./SalesBudgetCrosstab.css";
export declare function BottledWeeklyIssuesReportDocument({ report, }: {
    report: BottledWeeklyIssuesReport;
}): import("preact").JSX.Element;
export declare function BottledWeeklyIssuesReportScreen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
