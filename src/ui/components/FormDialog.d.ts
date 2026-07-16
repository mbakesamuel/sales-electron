import type { ComponentChildren } from "preact";
import "./FormDialog.css";
interface FormDialogProps {
    ariaLabel: string;
    title: string;
    subtitle?: string;
    wide?: boolean;
    elevated?: boolean;
    onClose: () => void;
    children: ComponentChildren;
}
export declare function FormDialog({ ariaLabel, title, subtitle, wide, elevated, onClose, children, }: FormDialogProps): import("preact").VNode<any>;
export {};
