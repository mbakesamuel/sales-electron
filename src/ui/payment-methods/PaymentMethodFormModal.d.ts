import type { PaymentMethodKind } from "../../shared/sales.types.ts";
import "../components/FormDialog.css";
interface PaymentMethodFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare const PAYMENT_METHOD_KIND_LABELS: Record<PaymentMethodKind, string>;
export declare function PaymentMethodFormModal({ mode, row, onClose, onSaved, }: PaymentMethodFormModalProps): import("preact").JSX.Element;
export {};
