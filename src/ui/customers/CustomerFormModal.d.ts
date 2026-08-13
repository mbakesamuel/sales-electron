import "../components/FormDialog.css";
import "./CustomerFormModal.css";
interface CustomerFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function CustomerFormModal({ mode, row, onClose, onSaved, }: CustomerFormModalProps): import("preact").JSX.Element;
export {};
