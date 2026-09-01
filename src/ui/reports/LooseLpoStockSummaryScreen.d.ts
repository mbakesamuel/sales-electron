import type { LooseLpoStockSummaryReport } from "../../shared/reports.types.ts";
import "./StockCommitmentReport.css";
import "./MonthlyBottledOilReport.css";
import "./LooseLpoStockSummaryReport.css";
export declare function LooseLpoStockSummaryDocument({ report, }: {
    report: LooseLpoStockSummaryReport;
}): import("preact").JSX.Element;
export declare function LooseLpoStockSummaryScreen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
