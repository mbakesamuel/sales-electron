import "../components/FormDialog.css";
interface UserFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function UserFormModal({ mode, row, onClose, onSaved, }: UserFormModalProps): import("preact").JSX.Element;
export {};
