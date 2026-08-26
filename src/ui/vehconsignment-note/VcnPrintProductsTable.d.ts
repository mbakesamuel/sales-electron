import type { ConsignmentPrintPayload } from "../../shared/vehicleConsignmentNotes.types.ts";
import "./VcnPrintProductsTable.css";
interface VcnPrintProductsTableProps {
    payload: ConsignmentPrintPayload;
}
export declare function VcnPrintProductsTable({ payload }: VcnPrintProductsTableProps): import("preact").JSX.Element;
export {};
