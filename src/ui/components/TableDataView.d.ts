import "./TableDataView.css";
interface TableDataViewProps {
    table: string;
    description?: string;
    readOnly?: boolean;
}
export declare function TableDataView({ table, description, readOnly }: TableDataViewProps): import("preact").JSX.Element;
export {};
