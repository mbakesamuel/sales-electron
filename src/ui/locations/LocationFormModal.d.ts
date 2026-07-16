import "../components/FormDialog.css";
interface LocationFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function LocationFormModal({ mode, row, onClose, onSaved, }: LocationFormModalProps): import("preact").JSX.Element;
export {};
