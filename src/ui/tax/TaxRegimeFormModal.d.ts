import "../components/FormDialog.css";
interface TaxRegimeFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function TaxRegimeFormModal({ mode, row, onClose, onSaved, }: TaxRegimeFormModalProps): import("preact").JSX.Element;
export {};
