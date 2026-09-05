import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "../customers/CustomersScreen.css";
import "../reports/StockCommitmentReport.css";
import "./TransportCostComputeScreen.css";
interface TransportCostComputeScreenProps {
    permissions: RolePermissionsSnapshot;
    readOnly?: boolean;
}
export declare function TransportCostComputeScreen({ permissions, readOnly, }: TransportCostComputeScreenProps): import("preact").JSX.Element;
export {};
