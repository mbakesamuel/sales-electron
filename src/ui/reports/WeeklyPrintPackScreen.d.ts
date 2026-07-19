import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import "./StockCommitmentReport.css";
import "./BottledWeeklyIssuesReport.css";
import "./SalesBudgetCrosstab.css";
import "./WeeklyPrintPack.css";
export type WeeklyPrintPackReportId = "stock-commitment-report" | "stock-report" | "commitment-report" | "bottle-oil-stock-sales-report" | "bottled-weekly-issues-report" | "sales-delivery-report" | "sales-budget-weekly-crosstab";
interface WeeklyPrintPackScreenProps {
    permissions: RolePermissionsSnapshot;
}
export declare function WeeklyPrintPackScreen({ permissions }: WeeklyPrintPackScreenProps): import("preact").JSX.Element;
export {};
