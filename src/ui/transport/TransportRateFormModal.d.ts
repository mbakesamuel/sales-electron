import "../components/FormDialog.css";
interface TransportRateFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function TransportRateFormModal({ mode, row, onClose, onSaved, }: TransportRateFormModalProps): import("preact").JSX.Element;
export {};
