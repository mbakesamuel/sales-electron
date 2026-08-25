import { useEffect, useState } from "preact/hooks";
import { AUTH_TOKEN_KEY } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import { AppLoadingShell } from "../components/AppLoadingShell.tsx";
import { parseReportWindowHash } from "../../shared/reportWindow.ts";
import { ReportBody } from "../reports/reportBody.tsx";
import { applyUiTheme } from "../theme/applyUiTheme.ts";
import "../app.css";

type BootstrapState =
  | { status: "waiting" }
  | { status: "ready"; reportId: string; query?: unknown }
  | { status: "error"; message: string };

export function ReportWindowApp() {
  const [state, setState] = useState<BootstrapState>({ status: "waiting" });

  useEffect(() => {
    applyUiTheme("agro");

    const hashReportId = parseReportWindowHash();
    if (!hashReportId) {
      setState({ status: "error", message: "Missing report window route." });
      return;
    }

    const api = getElectronApi();
    let cancelled = false;

    async function applyBootstrap(payload: {
      reportId: string;
      authToken: string;
      query?: unknown;
    }) {
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
          query: payload.query,
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
    return <AppLoadingShell status="Opening report…" />;
  }

  if (state.status === "error") {
    return <AppLoadingShell status={state.message} error />;
  }

  return (
    <main class="report-window-root">
      <ReportBody
        reportId={state.reportId}
        query={state.query}
        windowMode
      />
    </main>
  );
}
