import type { MonthlyStockReconciliationReport } from "../../shared/reports.types.ts";
import "./StockCommitmentReport.css";
import "./MonthlyStockReconciliationReport.css";
export declare function MonthlyStockReconciliationDocument({ report, }: {
    report: MonthlyStockReconciliationReport;
}): import("preact").JSX.Element;
export declare function MonthlyStockReconciliationScreen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
