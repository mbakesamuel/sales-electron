import { getAuthToken } from "./db.ts";
import { getElectronApi } from "./client.ts";

function requireAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Login required.");
  }
  return token;
}

export function getAuthenticatedReports() {
  const api = getElectronApi().reports;

  return {
    getStockCommitment: () => api.getStockCommitment(requireAuthToken()),
    getStockReport: () => api.getStockReport(requireAuthToken()),
    getCommitmentReport: () => api.getCommitmentReport(requireAuthToken()),
    getBottleOilStockSales: () => api.getBottleOilStockSales(requireAuthToken()),
    getBottledWeeklyIssues: (
      estimateBasis?: import("../../shared/reports.types.ts").BottledWeeklyEstimateBasis,
      weekMondayIso?: string,
    ) => api.getBottledWeeklyIssues(requireAuthToken(), estimateBasis, weekMondayIso),
    getWeekChoices: () => api.getWeekChoices(requireAuthToken()),
    getWeeklyDeliveries: (weekMondayIso?: string) =>
      api.getWeeklyDeliveries(requireAuthToken(), weekMondayIso),
    getMonthlyDelivery: (half: 1 | 2) =>
      api.getMonthlyDelivery(half, requireAuthToken()),
    getSalesBudgetMonthlyCrosstab: (reportYear?: number) =>
      api.getSalesBudgetMonthlyCrosstab(requireAuthToken(), reportYear),
    getSalesBudgetWeeklyCrosstab: (reportYear?: number) =>
      api.getSalesBudgetWeeklyCrosstab(requireAuthToken(), reportYear),
    getDailySales: (reportDateIso: string, salesPointId?: number | null) =>
      api.getDailySales(requireAuthToken(), reportDateIso, salesPointId ?? null),
    saveReportComments: (input: { reportId: string; text: string | null }) =>
      api.saveReportComments(requireAuthToken(), input),
  };
}
