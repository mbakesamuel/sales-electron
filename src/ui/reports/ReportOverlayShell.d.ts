import type { ComponentChildren } from "preact";
import "./ReportOverlayShell.css";
interface ReportOverlayShellProps {
    reportId?: string;
    title?: string;
    onClose: () => void;
    children: ComponentChildren;
}
export declare function ReportOverlayShell({ reportId, title, onClose, children, }: ReportOverlayShellProps): import("preact").JSX.Element;
export {};
