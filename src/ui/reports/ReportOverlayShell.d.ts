import type { ComponentChildren } from "preact";
import "./ReportOverlayShell.css";
interface ReportOverlayShellProps {
    reportId?: string;
    title?: string;
    /** Report PDF pane: Print plus Close with an X. Other documents keep the outline Close only. */
    preview?: boolean;
    /** Portal to document.body above stock/form modals (z-index 130). */
    elevated?: boolean;
    onClose: () => void;
    children: ComponentChildren;
}
export declare function ReportOverlayShell({ reportId, title, preview, elevated, onClose, children, }: ReportOverlayShellProps): import("preact").JSX.Element;
export {};
