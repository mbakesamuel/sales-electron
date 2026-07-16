import { app, BrowserWindow, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabase, initDatabase } from "./db/index.js";
import { registerDeliveryOrdersHandlers } from "./ipc/deliveryOrders.js";
import { registerAuthHandlers } from "./ipc/auth.js";
import { registerDatabaseHandlers } from "./ipc/database.js";
import { registerPermissionsHandlers } from "./ipc/permissions.js";
import { registerSalesHandlers } from "./ipc/sales.js";
import { registerReportsHandlers } from "./ipc/reports.js";
import { registerStockHandlers } from "./ipc/stock.js";
import { registerFinancialYearsHandlers } from "./ipc/financialYears.js";
import { backfillFinancialMonths } from "./financialYears/service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SERVER_URL = "http://localhost:5173";

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 800,
    height:600,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(DEV_SERVER_URL);
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
  registerStockHandlers();
  registerReportsHandlers();
  registerFinancialYearsHandlers();
  registerPermissionsHandlers();
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
