import type { ComponentChildren } from "preact";
import "./ReportFooter.css";
export interface ReportFooterProps {
    /** Role shown above the signature space. */
    label?: string;
    /** Optional printed name under the signature line. */
    name?: string | null;
    children?: ComponentChildren;
}
export declare function ReportFooter({ label, name, children, }: ReportFooterProps): import("preact").JSX.Element;
