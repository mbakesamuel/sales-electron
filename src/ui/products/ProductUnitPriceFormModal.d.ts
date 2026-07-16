import "../components/FormDialog.css";
interface ProductUnitPriceFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function ProductUnitPriceFormModal({ mode, row, onClose, onSaved, }: ProductUnitPriceFormModalProps): import("preact").JSX.Element;
export {};
