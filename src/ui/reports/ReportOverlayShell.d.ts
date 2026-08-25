import type { ComponentChildren } from "preact";
import "./ReportOverlayShell.css";
interface ReportOverlayShellProps {
    reportId: string;
    onClose: () => void;
    children: ComponentChildren;
}
export declare function ReportOverlayShell({ reportId, onClose, children, }: ReportOverlayShellProps): import("preact").JSX.Element;
export {};
