import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRouteLabel } from "../../shared/routeCatalog.js";
import { REPORT_WINDOW_ROUTE_IDS } from "../../shared/reportWindow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SERVER_URL = "http://localhost:5173";

export interface ReportWindowBootstrap {
  reportId: string;
  authToken: string;
  /** Optional filter/query payload for parameterized reports (e.g. bin card). */
  query?: unknown;
}

const openReportWindows = new Map<string, BrowserWindow>();
const pendingBootstraps = new Map<string, ReportWindowBootstrap>();

export { REPORT_WINDOW_ROUTE_IDS };

function reportWindowHash(reportId: string): string {
  return `#/report-window/${reportId}`;
}

function preloadPath(): string {
  return path.join(__dirname, "..", "preload.cjs");
}

async function loadReportWindowUrl(win: BrowserWindow, reportId: string): Promise<void> {
  const hash = reportWindowHash(reportId);
  if (!app.isPackaged) {
    await win.loadURL(`${DEV_SERVER_URL}/${hash}`);
  } else {
    await win.loadFile(path.join(app.getAppPath(), "dist-react", "index.html"), {
      hash: `/report-window/${reportId}`,
    });
  }
}

function rememberBootstrap(payload: ReportWindowBootstrap): void {
  pendingBootstraps.set(payload.reportId, payload);
}

function sendBootstrap(win: BrowserWindow, payload: ReportWindowBootstrap): void {
  rememberBootstrap(payload);
  if (win.isDestroyed()) {
    return;
  }
  win.webContents.send("report-window:bootstrap", payload);
}

/** Used when the renderer mounts after did-finish-load already fired. */
export function getPendingReportBootstrap(
  reportId: string,
): ReportWindowBootstrap | null {
  return pendingBootstraps.get(reportId) ?? null;
}

/**
 * Open or focus a dedicated report BrowserWindow and bootstrap auth into it.
 */
export async function openOrFocusReportWindow(
  reportId: string,
  authToken: string,
  query?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!REPORT_WINDOW_ROUTE_IDS.has(reportId)) {
    return { ok: false, error: `Report window is not enabled for "${reportId}".` };
  }

  const payload: ReportWindowBootstrap = {
    reportId,
    authToken,
    ...(query !== undefined ? { query } : {}),
  };

  const existing = openReportWindows.get(reportId);
  if (existing && !existing.isDestroyed()) {
    sendBootstrap(existing, payload);
    if (existing.isMinimized()) {
      existing.restore();
    }
    existing.focus();
    return { ok: true };
  }

  // A4 portrait ≈ 210×297mm; use that shape for ledger-style reports.
  const portraitReport =
    reportId === "stock-bin-card-report"
      ? { width: 820, height: 1120 }
      : { width: 1000, height: 800 };

  const win = new BrowserWindow({
    width: portraitReport.width,
    height: portraitReport.height,
    title: getRouteLabel(reportId),
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  openReportWindows.set(reportId, win);
  rememberBootstrap(payload);

  win.on("closed", () => {
    if (openReportWindows.get(reportId) === win) {
      openReportWindows.delete(reportId);
    }
    pendingBootstraps.delete(reportId);

    for (const other of BrowserWindow.getAllWindows()) {
      if (other.isDestroyed()) {
        continue;
      }
      const isReportWindow = [...openReportWindows.values()].includes(other);
      if (isReportWindow) {
        continue;
      }
      other.webContents.send("report-window:closed", { reportId });
    }
  });

  win.webContents.on("did-finish-load", () => {
    const pending = pendingBootstraps.get(reportId) ?? payload;
    sendBootstrap(win, pending);
  });

  try {
    await loadReportWindowUrl(win, reportId);
  } catch (error) {
    openReportWindows.delete(reportId);
    if (!win.isDestroyed()) {
      win.destroy();
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to open report window.",
    };
  }

  return { ok: true };
}
