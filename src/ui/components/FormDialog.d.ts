import type { ComponentChildren } from "preact";
import "./FormDialog.css";
interface FormDialogProps {
    ariaLabel: string;
    title: string;
    subtitle?: string;
    wide?: boolean;
    elevated?: boolean;
    /** Extra class(es) on the dialog panel (e.g. screen-specific wider layouts). */
    panelClassName?: string;
    onClose: () => void;
    children: ComponentChildren;
}
export declare function FormDialog({ ariaLabel, title, subtitle, wide, elevated, panelClassName, onClose, children, }: FormDialogProps): import("preact").VNode<any>;
export {};
