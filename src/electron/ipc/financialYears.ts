import { ipcMain } from "electron";
import type {
  FinancialMonthRow,
  FinancialPeriodStatus,
  FinancialYearRow,
  OpenPostingPeriod,
  OpenYearResult,
} from "../../shared/financialYears.types.js";
import { requireAuthUser } from "../auth/requireUser.js";
import {
  closeYear,
  getOpenPostingPeriod,
  listMonthsForOpenYear,
  listMonthsForPeriod,
  listYears,
  openYear,
  setMonthStatus,
} from "../financialYears/service.js";

export function registerFinancialYearsHandlers(): void {
  ipcMain.handle(
    "financialYears:listYears",
    (_event, authToken: string): FinancialYearRow[] => {
      requireAuthUser(authToken);
      return listYears();
    },
  );

  ipcMain.handle(
    "financialYears:openYear",
    (_event, authToken: string, financialYear: number): OpenYearResult => {
      requireAuthUser(authToken);
      return openYear(financialYear);
    },
  );

  ipcMain.handle(
    "financialYears:closeYear",
    (_event, authToken: string, periodId: string): FinancialYearRow => {
      requireAuthUser(authToken);
      return closeYear(periodId);
    },
  );

  ipcMain.handle(
    "financialYears:listMonthsForOpenYear",
    (
      _event,
      authToken: string,
    ): { year: FinancialYearRow | null; months: FinancialMonthRow[] } => {
      requireAuthUser(authToken);
      return listMonthsForOpenYear();
    },
  );

  ipcMain.handle(
    "financialYears:listMonthsForPeriod",
    (_event, authToken: string, periodId: string): FinancialMonthRow[] => {
      requireAuthUser(authToken);
      return listMonthsForPeriod(periodId);
    },
  );

  ipcMain.handle(
    "financialYears:setMonthStatus",
    (
      _event,
      authToken: string,
      monthId: string,
      status: FinancialPeriodStatus,
    ): FinancialMonthRow => {
      requireAuthUser(authToken);
      return setMonthStatus(monthId, status);
    },
  );

  ipcMain.handle(
    "financialYears:getOpenPostingPeriod",
    (_event, authToken: string): OpenPostingPeriod | null => {
      requireAuthUser(authToken);
      return getOpenPostingPeriod();
    },
  );
}
