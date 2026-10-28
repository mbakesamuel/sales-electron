import type { ComponentChildren } from "preact";
interface ReportFilterGateProps {
    ready: boolean;
    reportId: string;
    className?: string;
    filters: ComponentChildren;
    children: ComponentChildren;
}
export declare function ReportFilterGate({ ready, reportId, className, filters, children, }: ReportFilterGateProps): import("preact").JSX.Element;
export {};
