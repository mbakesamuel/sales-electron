import "../components/FormDialog.css";
interface CustomerTypeFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function CustomerTypeFormModal({ mode, row, onClose, onSaved, }: CustomerTypeFormModalProps): import("preact").JSX.Element;
export {};
