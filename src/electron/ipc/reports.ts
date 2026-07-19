import { ipcMain } from "electron";
import type {
  BottleOilStockSalesReport,
  BottledWeeklyIssuesReport,
  CommitmentReport,
  StockCommitmentReport,
  StockReport,
  MonthlyDeliveryReport,
  SalesBudgetMonthlyCrosstabReport,
  SalesBudgetWeeklyCrosstabReport,
  WeeklyDeliveriesReport,
} from "../../shared/reports.types.js";
import { requireAuthUser } from "../auth/requireUser.js";
import { getMonthlyDeliveryReport } from "../reports/monthlyDeliveryReport.js";
import { getBottleOilStockSalesReport } from "../reports/bottleOilStockSalesReport.js";
import { getBottledWeeklyIssuesReport } from "../reports/bottledWeeklyIssuesReport.js";
import { getCommitmentReport } from "../reports/commitmentReport.js";
import { getSalesBudgetMonthlyCrosstabReport } from "../reports/salesBudgetMonthlyCrosstab.js";
import { getSalesBudgetWeeklyCrosstabReport } from "../reports/salesBudgetWeeklyCrosstab.js";
import { getStockCommitmentReport } from "../reports/stockCommitment.js";
import { getStockReport } from "../reports/stockReport.js";
import { getWeeklyDeliveriesReport } from "../reports/weeklyDeliveriesReport.js";

function parseReportYear(value: unknown): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function registerReportsHandlers(): void {
  ipcMain.handle(
    "reports:getStockCommitment",
    (_event, authToken: string): StockCommitmentReport => {
      const user = requireAuthUser(authToken);
      return getStockCommitmentReport(user.id);
    },
  );

  ipcMain.handle(
    "reports:getStockReport",
    (_event, authToken: string): StockReport => {
      const user = requireAuthUser(authToken);
      return getStockReport(user.id);
    },
  );

  ipcMain.handle(
    "reports:getCommitmentReport",
    (_event, authToken: string): CommitmentReport => {
      const user = requireAuthUser(authToken);
      return getCommitmentReport(user.id);
    },
  );

  ipcMain.handle(
    "reports:getBottleOilStockSales",
    (_event, authToken: string): BottleOilStockSalesReport => {
      const user = requireAuthUser(authToken);
      return getBottleOilStockSalesReport(user.id);
    },
  );

  ipcMain.handle(
    "reports:getBottledWeeklyIssues",
    (
      _event,
      authToken: string,
      estimateBasis?: unknown,
    ): BottledWeeklyIssuesReport => {
      const user = requireAuthUser(authToken);
      return getBottledWeeklyIssuesReport(user.id, estimateBasis);
    },
  );

  ipcMain.handle(
    "reports:getWeeklyDeliveries",
    (_event, authToken: string): WeeklyDeliveriesReport => {
      const user = requireAuthUser(authToken);
      return getWeeklyDeliveriesReport(user.id);
    },
  );

  ipcMain.handle(
    "reports:getMonthlyDelivery",
    (_event, half: number, authToken: string): MonthlyDeliveryReport => {
      if (half !== 1 && half !== 2) {
        throw new Error("Report half must be 1 or 2.");
      }
      const user = requireAuthUser(authToken);
      return getMonthlyDeliveryReport(half, user.id);
    },
  );

  ipcMain.handle(
    "reports:getSalesBudgetMonthlyCrosstab",
    (_event, authToken: string, reportYear?: unknown): SalesBudgetMonthlyCrosstabReport => {
      const user = requireAuthUser(authToken);
      return getSalesBudgetMonthlyCrosstabReport(user.id, parseReportYear(reportYear));
    },
  );

  ipcMain.handle(
    "reports:getSalesBudgetWeeklyCrosstab",
    (_event, authToken: string, reportYear?: unknown): SalesBudgetWeeklyCrosstabReport => {
      const user = requireAuthUser(authToken);
      return getSalesBudgetWeeklyCrosstabReport(user.id, parseReportYear(reportYear));
    },
  );
}
