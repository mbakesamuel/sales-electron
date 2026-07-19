import type { SalesBudgetWeeklyCrosstabReport } from "../../shared/reports.types.ts";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";
interface SalesBudgetWeeklyCrosstabScreenProps {
    onNavigate?: (routeId: string) => void;
}
export declare function buildQtyMap(report: SalesBudgetWeeklyCrosstabReport): Map<string, number>;
export declare function SalesBudgetWeeklyCrosstabDocument({ report, qtyMap, }: {
    report: SalesBudgetWeeklyCrosstabReport;
    qtyMap: Map<string, number>;
}): import("preact").JSX.Element;
export declare function SalesBudgetWeeklyCrosstabScreen({ onNavigate, }: SalesBudgetWeeklyCrosstabScreenProps): import("preact").JSX.Element;
export {};
