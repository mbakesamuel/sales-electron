import type { WeeklyDeliveriesReport } from "../../shared/reports.types.ts";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";
export declare function WeeklyDeliveriesReportDocument({ report, }: {
    report: WeeklyDeliveriesReport;
}): import("preact").JSX.Element;
export declare function WeeklyDeliveriesReportScreen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
