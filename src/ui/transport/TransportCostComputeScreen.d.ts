import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "../commitments/CarryForwardCommitmentsScreen.css";
interface TransportCostComputeScreenProps {
    permissions: RolePermissionsSnapshot;
    readOnly?: boolean;
}
export declare function TransportCostComputeScreen({ permissions, readOnly, }: TransportCostComputeScreenProps): import("preact").JSX.Element;
export {};
