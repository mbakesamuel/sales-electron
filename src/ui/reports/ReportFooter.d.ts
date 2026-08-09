import type { ComponentChildren } from "preact";
import "./ReportFooter.css";
export interface ReportFooterProps {
    /** Role shown under the printed name. */
    label: string;
    /** Optional printed name above the role label. Null/empty hides the name line. */
    name?: string | null;
    children?: ComponentChildren;
}
export declare function ReportFooter({ label, name, children }: ReportFooterProps): import("preact").JSX.Element;
