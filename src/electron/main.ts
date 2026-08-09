import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabase, initDatabase } from "./db/index.js";
import { registerDeliveryOrdersHandlers } from "./ipc/deliveryOrders.js";
import { registerCarryForwardHandlers } from "./ipc/carryForward.js";
import { registerCarryForwardStockHandlers } from "./ipc/carryForwardStock.js";
import { registerAuthHandlers } from "./ipc/auth.js";
import { registerDatabaseHandlers } from "./ipc/database.js";
import { registerPermissionsHandlers } from "./ipc/permissions.js";
import { registerSalesHandlers } from "./ipc/sales.js";
import { registerReportsHandlers } from "./ipc/reports.js";
import { registerDashboardHandlers } from "./ipc/dashboard.js";
import { registerStockHandlers } from "./ipc/stock.js";
import { registerFinancialYearsHandlers } from "./ipc/financialYears.js";
import { registerDialogHandlers } from "./ipc/dialog.js";
import { registerPrintHandlers } from "./ipc/print.js";
import { registerWindowsHandlers } from "./ipc/windows.js";
import { backfillFinancialMonths } from "./financialYears/service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SERVER_URL = "http://localhost:5173";

async function waitForDevServer(
  url: string,
  attempts = 40,
  delayMs = 250,
): Promise<void> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok || response.status === 404) {
        return;
      }
    } catch {
      // Vite not up yet, or transient network change — retry.
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Dev server did not become ready at ${url}`);
}

async function loadDevUrl(mainWindow: BrowserWindow): Promise<void> {
  await waitForDevServer(DEV_SERVER_URL);

  const maxLoadAttempts = 5;
  for (let attempt = 1; attempt <= maxLoadAttempts; attempt += 1) {
    try {
      await mainWindow.loadURL(DEV_SERVER_URL);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("ERR_NETWORK_CHANGED") ||
        message.includes("ERR_CONNECTION_REFUSED") ||
        message.includes("ERR_CONNECTION_RESET") ||
        message.includes("ERR_FAILED");
      if (!retryable || attempt === maxLoadAttempts) {
        throw error;
      }
      console.warn(
        `Dev URL load failed (attempt ${attempt}/${maxLoadAttempts}): ${message}. Retrying…`,
      );
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: "Sales Management Application",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    void loadDevUrl(mainWindow).catch((error) => {
      console.error("Failed to load Vite dev server:", error);
    });
  } else {
    mainWindow.loadFile(
      path.join(app.getAppPath(), "dist-react", "index.html"),
    );
  }

  return mainWindow;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  try {
    initDatabase();
    backfillFinancialMonths();
  } catch (error) {
    console.error("Database initialization failed:", error);
    app.exit(1);
    return;
  }
  registerDatabaseHandlers();
  registerAuthHandlers();
  registerSalesHandlers();
  registerDeliveryOrdersHandlers();
  registerCarryForwardHandlers();
  registerCarryForwardStockHandlers();
  registerStockHandlers();
  registerReportsHandlers();
  registerDashboardHandlers();
  registerFinancialYearsHandlers();
  registerPermissionsHandlers();
  registerDialogHandlers();
  registerPrintHandlers();
  registerWindowsHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    closeDatabase();
    app.quit();
  }
});

app.on("before-quit", () => {
  closeDatabase();
});
