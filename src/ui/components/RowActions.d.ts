export interface RowActionsProps {
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    canWrite?: boolean;
    disableDelete?: boolean;
}
export declare function RowActions({ onView, onEdit, onDelete, canWrite, disableDelete, }: RowActionsProps): import("preact").JSX.Element;
