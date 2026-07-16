import "../components/FormDialog.css";
interface CategoryFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function CategoryFormModal({ mode, row, onClose, onSaved, }: CategoryFormModalProps): import("preact").JSX.Element;
export {};
