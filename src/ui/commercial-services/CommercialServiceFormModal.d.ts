import "../components/FormDialog.css";
interface CommercialServiceFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function CommercialServiceFormModal({ mode, row, onClose, onSaved, }: CommercialServiceFormModalProps): import("preact").JSX.Element;
export {};
