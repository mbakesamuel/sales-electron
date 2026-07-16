import "../components/FormDialog.css";
interface TaxRateFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function TaxRateFormModal({ mode, row, onClose, onSaved, }: TaxRateFormModalProps): import("preact").JSX.Element;
export {};
