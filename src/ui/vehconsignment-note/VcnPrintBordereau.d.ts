import type { ConsignmentPrintPayload } from "../../shared/vehicleConsignmentNotes.types.ts";
import "./VcnPrintBordereau.css";
interface VcnPrintBordereauProps {
    payload: ConsignmentPrintPayload;
}
export declare function VcnPrintBordereau({ payload }: VcnPrintBordereauProps): import("preact").JSX.Element;
export {};
