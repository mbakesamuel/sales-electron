import type { ComponentChildren } from "preact";
import "./ReportHeader.css";
export interface ReportHeaderProps {
    companyName?: string;
    department: string | null;
    serviceName: string | null;
    title: string;
    meta?: ComponentChildren;
}
export declare function ReportHeader({ department, serviceName, title, meta, }: ReportHeaderProps): import("preact").JSX.Element;
