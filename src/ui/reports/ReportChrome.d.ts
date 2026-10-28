import type { ComponentChildren } from "preact";
export type ReportPrintAction = {
    print: () => void;
    busy: boolean;
    canPrint: boolean;
};
export declare function ReportChromeProvider({ children }: {
    children: ComponentChildren;
}): import("preact").JSX.Element;
export declare function useReportPrintRegister(): ((action: ReportPrintAction | null) => void) | null;
export declare function ReportPrintButton(): import("preact").JSX.Element;
