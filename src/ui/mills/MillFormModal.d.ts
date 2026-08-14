import "../components/FormDialog.css";
interface MillFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function MillFormModal({ mode, row, onClose, onSaved, }: MillFormModalProps): import("preact").JSX.Element;
export {};
