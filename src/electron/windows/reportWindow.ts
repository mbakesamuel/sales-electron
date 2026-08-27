import { app, BrowserWindow, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRouteLabel } from "../../shared/routeCatalog.js";
import { REPORT_WINDOW_ROUTE_IDS } from "../../shared/reportWindow.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SERVER_URL = "http://localhost:5173";

/** Match main window create defaults in main.ts when no main window exists. */
const FALLBACK_WINDOW_SIZE = { width: 1800, height: 800 };
const MAIN_INSET_PX = 48;

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

function isTrackedReportWindow(win: BrowserWindow): boolean {
  for (const reportWin of openReportWindows.values()) {
    if (reportWin === win) {
      return true;
    }
  }
  return false;
}

/** Size every report window near the main app window (small inset). */
function sizeNearMainApp(): { width: number; height: number } {
  const focused = BrowserWindow.getFocusedWindow();
  const main =
    focused && !focused.isDestroyed() && !isTrackedReportWindow(focused)
      ? focused
      : BrowserWindow.getAllWindows().find(
          (win) => !win.isDestroyed() && !isTrackedReportWindow(win),
        );

  const bounds = main?.getBounds() ?? {
    x: 0,
    y: 0,
    width: FALLBACK_WINDOW_SIZE.width,
    height: FALLBACK_WINDOW_SIZE.height,
  };

  const workArea = screen.getDisplayMatching(bounds).workAreaSize;

  const width = Math.min(
    workArea.width,
    Math.max(FALLBACK_WINDOW_SIZE.width, bounds.width - MAIN_INSET_PX),
  );
  const height = Math.min(
    workArea.height,
    Math.max(FALLBACK_WINDOW_SIZE.height, bounds.height - MAIN_INSET_PX),
  );

  return { width, height };
}

async function loadReportWindowUrl(
  win: BrowserWindow,
  reportId: string,
): Promise<void> {
  const hash = reportWindowHash(reportId);
  if (!app.isPackaged) {
    await win.loadURL(`${DEV_SERVER_URL}/${hash}`);
  } else {
    await win.loadFile(
      path.join(app.getAppPath(), "dist-react", "index.html"),
      {
        hash: `/report-window/${reportId}`,
      },
    );
  }
}

function rememberBootstrap(payload: ReportWindowBootstrap): void {
  pendingBootstraps.set(payload.reportId, payload);
}

function sendBootstrap(
  win: BrowserWindow,
  payload: ReportWindowBootstrap,
): void {
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
    return {
      ok: false,
      error: `Report window is not enabled for "${reportId}".`,
    };
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

  const windowSize = sizeNearMainApp();

  const win = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
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
      error:
        error instanceof Error
          ? error.message
          : "Failed to open report window.",
    };
  }

  return { ok: true };
}
