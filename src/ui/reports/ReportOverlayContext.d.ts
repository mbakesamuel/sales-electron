export interface ReportOverlayContextValue {
    openReportOverlay: (reportId: string, query?: unknown) => void;
}
export declare const ReportOverlayContext: import("preact").Context<ReportOverlayContextValue>;
export declare function useReportOverlay(): ReportOverlayContextValue;
