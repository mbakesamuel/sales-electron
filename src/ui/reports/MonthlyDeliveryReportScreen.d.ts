import "./StockCommitmentReport.css";
import "./MonthlyDeliveryReport.css";
interface MonthlyDeliveryReportScreenProps {
    half: 1 | 2;
    windowMode?: boolean;
}
export declare function MonthlyDeliveryReportScreen({ half, windowMode, }: MonthlyDeliveryReportScreenProps): import("preact").JSX.Element;
export declare function MonthlyDeliveryReportH1Screen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
export declare function MonthlyDeliveryReportH2Screen({ windowMode, }: {
    windowMode?: boolean;
}): import("preact").JSX.Element;
export {};
