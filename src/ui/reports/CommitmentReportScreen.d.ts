import type { CommitmentReport } from "../../shared/reports.types.ts";
import "./StockCommitmentReport.css";
export declare function CommitmentReportDocument({ report }: {
    report: CommitmentReport;
}): import("preact").JSX.Element;
export declare function CommitmentReportScreen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
