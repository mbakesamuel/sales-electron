import "../components/FormDialog.css";
interface ProductFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function ProductFormModal({ mode, row, onClose, onSaved, }: ProductFormModalProps): import("preact").JSX.Element;
export {};
