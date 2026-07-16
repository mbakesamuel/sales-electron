import { getAuthToken } from "./db.ts";
import { getElectronApi } from "./client.ts";

function requireAuthToken(): string {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Login required.");
  }
  return token;
}

export function getAuthenticatedFinancialYears() {
  const api = getElectronApi().financialYears;

  return {
    listYears: () => api.listYears(requireAuthToken()),
    openYear: (financialYear: number) =>
      api.openYear(requireAuthToken(), financialYear),
    closeYear: (periodId: string) => api.closeYear(requireAuthToken(), periodId),
    listMonthsForOpenYear: () => api.listMonthsForOpenYear(requireAuthToken()),
    listMonthsForPeriod: (periodId: string) =>
      api.listMonthsForPeriod(requireAuthToken(), periodId),
    setMonthStatus: (
      monthId: string,
      status: "OPEN" | "CLOSED",
    ) => api.setMonthStatus(requireAuthToken(), monthId, status),
    getOpenPostingPeriod: () => api.getOpenPostingPeriod(requireAuthToken()),
  };
}
