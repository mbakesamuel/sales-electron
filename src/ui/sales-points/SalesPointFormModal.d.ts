import "../components/FormDialog.css";
interface SalesPointFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function SalesPointFormModal({ mode, row, onClose, onSaved, }: SalesPointFormModalProps): import("preact").JSX.Element;
export {};
