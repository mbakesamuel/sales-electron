import { useCallback, useEffect, useState } from "preact/hooks";
import { AUTH_TOKEN_KEY } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import { useIdleSessionTimeout } from "../auth/useIdleSessionTimeout.ts";
import { AppLoadingShell } from "../components/AppLoadingShell.tsx";
import { parseReportWindowHash } from "../../shared/reportWindow.ts";
import { ReportBody } from "../reports/reportBody.tsx";
import { applyUiTheme } from "../theme/applyUiTheme.ts";
import "../app.css";

type BootstrapState =
  | { status: "waiting" }
  | { status: "ready"; reportId: string; query?: unknown }
  | { status: "error"; message: string };

const IDLE_SIGN_OUT_MESSAGE =
  "Signed out due to inactivity. Close this window and sign in again.";

export function ReportWindowApp() {
  const [state, setState] = useState<BootstrapState>({ status: "waiting" });
  const [sessionIdleTimeoutMinutes, setSessionIdleTimeoutMinutes] = useState(0);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const handleIdleSignOut = useCallback(async () => {
    const token = authToken ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setSessionIdleTimeoutMinutes(0);
    setState({ status: "error", message: IDLE_SIGN_OUT_MESSAGE });

    if (token) {
      try {
        await getElectronApi().auth.logout(token);
      } catch {
        // Session already cleared locally.
      }
    }
  }, [authToken]);

  useIdleSessionTimeout(
    state.status === "ready" ? sessionIdleTimeoutMinutes : 0,
    () => {
      void handleIdleSignOut();
    },
  );

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
        setAuthToken(payload.authToken);
        const session = await api.auth.getSession(payload.authToken);
        if (cancelled) {
          return;
        }
        if (!session) {
          sessionStorage.removeItem(AUTH_TOKEN_KEY);
          setAuthToken(null);
          setState({
            status: "error",
            message: "Session expired. Close this window and sign in again.",
          });
          return;
        }
        setSessionIdleTimeoutMinutes(session.sessionIdleTimeoutMinutes);
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
