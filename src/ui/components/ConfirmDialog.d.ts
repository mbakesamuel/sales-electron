import "./FormDialog.css";
import "./ConfirmDialog.css";
interface ConfirmDialogProps {
    ariaLabel: string;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: "primary" | "danger";
    busy?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare function ConfirmDialog({ ariaLabel, title, description, confirmLabel, cancelLabel, confirmVariant, busy, onCancel, onConfirm, }: ConfirmDialogProps): import("preact").JSX.Element;
export {};
