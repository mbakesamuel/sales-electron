import { ipcMain } from "electron";
import type {
  BottleOilStockSalesReport,
  BottledWeeklyIssuesReport,
  CommitmentReport,
  StockCommitmentReport,
  StockReport,
  MonthlyDeliveryReport,
  MonthlyStockReconciliationReport,
  MonthlyPaymentDeliveryReport,
  MonthlyDeliveriesByDestinationReport,
  ReportSignatoryRow,
  SalesBudgetMonthlyCrosstabReport,
  SalesBudgetWeeklyCrosstabReport,
  WeeklyDeliveriesReport,
  DailySalesReport,
} from "../../shared/reports.types.js";
import { requireAuthUser } from "../auth/requireUser.js";
import { getMonthlyDeliveryReport } from "../reports/monthlyDeliveryReport.js";
import { getMonthlyStockReconciliationReport } from "../reports/monthlyStockReconciliationReport.js";
import { getMonthlyPaymentDeliveryReport } from "../reports/monthlyPaymentDeliveryReport.js";
import { getMonthlyDeliveriesByDestinationReport } from "../reports/monthlyDeliveriesByDestinationReport.js";
import { getBottleOilStockSalesReport } from "../reports/bottleOilStockSalesReport.js";
import { getBottledWeeklyIssuesReport } from "../reports/bottledWeeklyIssuesReport.js";
import { getCommitmentReport } from "../reports/commitmentReport.js";
import { getSalesBudgetMonthlyCrosstabReport } from "../reports/salesBudgetMonthlyCrosstab.js";
import { getSalesBudgetWeeklyCrosstabReport } from "../reports/salesBudgetWeeklyCrosstab.js";
import { getStockCommitmentReport } from "../reports/stockCommitment.js";
import { getStockReport } from "../reports/stockReport.js";
import { getWeeklyDeliveriesReport } from "../reports/weeklyDeliveriesReport.js";
import { getDailySalesReport } from "../reports/dailySalesReport.js";
import { getOpenMonthWeekChoices } from "../reports/weekChoices.js";
import {
  saveReportComments,
  loadReportSignatory,
  type SaveReportCommentsResult,
} from "../reports/companySettings.js";
import {
  deleteReportSignatory,
  listReportSignatories,
  upsertReportSignatory,
  type DeleteReportSignatoryResult,
  type UpsertReportSignatoryResult,
} from "../reports/reportSignatory.js";

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
      weekMondayIso?: unknown,
    ): BottledWeeklyIssuesReport => {
      const user = requireAuthUser(authToken);
      const monday =
        typeof weekMondayIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(weekMondayIso)
          ? weekMondayIso
          : null;
      return getBottledWeeklyIssuesReport(user.id, estimateBasis, monday);
    },
  );

  ipcMain.handle(
    "reports:getWeekChoices",
    (_event, authToken: string) => {
      requireAuthUser(authToken);
      return getOpenMonthWeekChoices();
    },
  );

  ipcMain.handle(
    "reports:getWeeklyDeliveries",
    (
      _event,
      authToken: string,
      weekMondayIso?: unknown,
    ): WeeklyDeliveriesReport => {
      const user = requireAuthUser(authToken);
      const monday =
        typeof weekMondayIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(weekMondayIso)
          ? weekMondayIso
          : null;
      return getWeeklyDeliveriesReport(user.id, monday);
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
    "reports:getMonthlyStockReconciliation",
    (_event, authToken: string): MonthlyStockReconciliationReport => {
      const user = requireAuthUser(authToken);
      return getMonthlyStockReconciliationReport(user.id);
    },
  );

  ipcMain.handle(
    "reports:getMonthlyPaymentDelivery",
    (_event, authToken: string): MonthlyPaymentDeliveryReport => {
      const user = requireAuthUser(authToken);
      return getMonthlyPaymentDeliveryReport(user.id);
    },
  );

  ipcMain.handle(
    "reports:getMonthlyDeliveriesByDestination",
    (_event, authToken: string): MonthlyDeliveriesByDestinationReport => {
      const user = requireAuthUser(authToken);
      return getMonthlyDeliveriesByDestinationReport(user.id);
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

  ipcMain.handle(
    "reports:getDailySales",
    (
      _event,
      authToken: string,
      reportDateIso: unknown,
      salesPointId?: unknown,
    ): DailySalesReport => {
      const user = requireAuthUser(authToken);
      if (typeof reportDateIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(reportDateIso)) {
        throw new Error("Invalid report date.");
      }
      const pointId =
        salesPointId == null || salesPointId === ""
          ? null
          : Number.parseInt(String(salesPointId), 10);
      return getDailySalesReport(
        user.id,
        reportDateIso,
        Number.isFinite(pointId) ? pointId : null,
      );
    },
  );

  ipcMain.handle(
    "reports:saveReportComments",
    (
      _event,
      authToken: string,
      input: { reportId: string; text: string | null },
    ): SaveReportCommentsResult => {
      requireAuthUser(authToken);
      return saveReportComments(input.reportId, input.text);
    },
  );

  ipcMain.handle(
    "reports:listSignatories",
    (_event, authToken: string): ReportSignatoryRow[] => {
      requireAuthUser(authToken);
      return listReportSignatories();
    },
  );

  ipcMain.handle(
    "reports:getSignatory",
    (
      _event,
      authToken: string,
      asAtIso?: unknown,
    ): { name: string; title: string } => {
      requireAuthUser(authToken);
      return loadReportSignatory(
        typeof asAtIso === "string" ? asAtIso : null,
      );
    },
  );

  ipcMain.handle(
    "reports:upsertSignatory",
    (
      _event,
      authToken: string,
      input: {
        id?: string | null;
        name: string;
        title: string;
        effectiveFrom: string;
      },
    ): UpsertReportSignatoryResult => {
      const user = requireAuthUser(authToken);
      return upsertReportSignatory({
        userId: user.id,
        id: input.id,
        name: input.name,
        title: input.title,
        effectiveFrom: input.effectiveFrom,
      });
    },
  );

  ipcMain.handle(
    "reports:deleteSignatory",
    (
      _event,
      authToken: string,
      id: unknown,
    ): DeleteReportSignatoryResult => {
      const user = requireAuthUser(authToken);
      return deleteReportSignatory(user.id, String(id ?? ""));
    },
  );
}
