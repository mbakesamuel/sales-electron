import "../components/FormDialog.css";
interface StorageLocationFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function StorageLocationFormModal({ mode, row, onClose, onSaved, }: StorageLocationFormModalProps): import("preact").JSX.Element;
export {};
