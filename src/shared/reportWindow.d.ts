/** Hash prefix for dedicated Electron report windows. */
export declare const REPORT_WINDOW_HASH_PREFIX = "#/report-window/";
/** Routes that open in a secondary BrowserWindow. */
export declare const REPORT_WINDOW_ROUTE_IDS: Set<string>;
export declare function parseReportWindowHash(hash?: string): string | null;
export declare function isReportWindowMode(): boolean;
export declare function opensInReportWindow(reportId: string): boolean;
