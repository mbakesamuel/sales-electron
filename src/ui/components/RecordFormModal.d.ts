import type { TableSchema } from "../types/electron.d.ts";
type FormMode = "create" | "edit";
interface RecordFormModalProps {
    table: string;
    mode: FormMode;
    schema: TableSchema;
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function RecordFormModal({ table, mode, schema, row, onClose, onSaved, }: RecordFormModalProps): import("preact").JSX.Element;
export {};
