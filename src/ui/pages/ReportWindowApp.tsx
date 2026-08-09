import { useEffect, useState } from "preact/hooks";
import { AUTH_TOKEN_KEY } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import { parseReportWindowHash } from "../../shared/reportWindow.ts";
import { StockCommitmentReportScreen } from "../reports/StockCommitmentReport.tsx";
import { StockReportScreen } from "../reports/StockReportScreen.tsx";
import { CommitmentReportScreen } from "../reports/CommitmentReportScreen.tsx";
import { BottleOilStockSalesReportScreen } from "../reports/BottleOilStockSalesReportScreen.tsx";
import { BottledWeeklyIssuesReportScreen } from "../reports/BottledWeeklyIssuesReportScreen.tsx";
import { WeeklyDeliveriesReportScreen } from "../reports/WeeklyDeliveriesReportScreen.tsx";
import { DailySalesReportScreen } from "../reports/DailySalesReportScreen.tsx";
import {
  MonthlyDeliveryReportH1Screen,
  MonthlyDeliveryReportH2Screen,
} from "../reports/MonthlyDeliveryReportScreen.tsx";
import { MonthlyStockReconciliationScreen } from "../reports/MonthlyStockReconciliationScreen.tsx";
import { MonthlyPaymentDeliveryScreen } from "../reports/MonthlyPaymentDeliveryScreen.tsx";
import { MonthlyDeliveriesByDestinationScreen } from "../reports/MonthlyDeliveriesByDestinationScreen.tsx";
import { SalesBudgetMonthlyCrosstabScreen } from "../reports/SalesBudgetMonthlyCrosstabScreen.tsx";
import { SalesBudgetWeeklyCrosstabScreen } from "../reports/SalesBudgetWeeklyCrosstabScreen.tsx";
import { loadAndApplyCompanyTheme, applyUiTheme } from "../theme/applyUiTheme.ts";
import "../app.css";

type BootstrapState =
  | { status: "waiting" }
  | { status: "ready"; reportId: string }
  | { status: "error"; message: string };

function ReportBody({ reportId }: { reportId: string }) {
  switch (reportId) {
    case "stock-commitment-report":
      return <StockCommitmentReportScreen windowMode />;
    case "stock-report":
      return <StockReportScreen windowMode />;
    case "commitment-report":
      return <CommitmentReportScreen windowMode />;
    case "bottle-oil-stock-sales-report":
      return <BottleOilStockSalesReportScreen windowMode />;
    case "bottled-weekly-issues-report":
      return <BottledWeeklyIssuesReportScreen windowMode />;
    case "sales-delivery-report":
      return <WeeklyDeliveriesReportScreen windowMode />;
    case "daily-sales-report":
      return <DailySalesReportScreen windowMode />;
    case "monthly-delivery-report-h1":
      return <MonthlyDeliveryReportH1Screen windowMode />;
    case "monthly-delivery-report-h2":
      return <MonthlyDeliveryReportH2Screen windowMode />;
    case "monthly-stock-reconciliation-report":
      return <MonthlyStockReconciliationScreen windowMode />;
    case "monthly-payment-delivery-report":
      return <MonthlyPaymentDeliveryScreen windowMode />;
    case "monthly-deliveries-by-destination-report":
      return <MonthlyDeliveriesByDestinationScreen windowMode />;
    case "sales-budget-monthly-crosstab":
      return <SalesBudgetMonthlyCrosstabScreen windowMode />;
    case "sales-budget-weekly-crosstab":
      return <SalesBudgetWeeklyCrosstabScreen windowMode />;
    default:
      return (
        <p class="scr-status scr-status-error">
          Unknown report window: {reportId}
        </p>
      );
  }
}

export function ReportWindowApp() {
  const [state, setState] = useState<BootstrapState>({ status: "waiting" });

  useEffect(() => {
    applyUiTheme("agro");
    void loadAndApplyCompanyTheme().catch(() => {
      applyUiTheme("agro");
    });

    const hashReportId = parseReportWindowHash();
    if (!hashReportId) {
      setState({ status: "error", message: "Missing report window route." });
      return;
    }

    const api = getElectronApi();
    let cancelled = false;

    async function applyBootstrap(payload: { reportId: string; authToken: string }) {
      if (cancelled) {
        return;
      }
      try {
        if (payload.reportId !== hashReportId) {
          setState({
            status: "error",
            message: `Report mismatch (expected ${hashReportId}).`,
          });
          return;
        }
        sessionStorage.setItem(AUTH_TOKEN_KEY, payload.authToken);
        const session = await api.auth.getSession(payload.authToken);
        if (cancelled) {
          return;
        }
        if (!session) {
          sessionStorage.removeItem(AUTH_TOKEN_KEY);
          setState({
            status: "error",
            message: "Session expired. Close this window and sign in again.",
          });
          return;
        }
        setState({
          status: "ready",
          reportId: payload.reportId,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to bootstrap report window.",
          });
        }
      }
    }

    const unsubscribe = api.reportWindow.onBootstrap((payload) => {
      void applyBootstrap(payload);
    });

    void api.reportWindow.getBootstrap(hashReportId).then((pending) => {
      if (pending) {
        void applyBootstrap(pending);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (state.status === "waiting") {
    return <main class="app-loading">Opening report…</main>;
  }

  if (state.status === "error") {
    return <main class="app-loading scr-status-error">{state.message}</main>;
  }

  return (
    <main class="report-window-root">
      <ReportBody reportId={state.reportId} />
    </main>
  );
}
