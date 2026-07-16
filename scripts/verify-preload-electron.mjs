import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const preloadPath = path.join(
  __dirname,
  "../dist-electron/electron/preload.cjs",
);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = "http://localhost:5173/";
  const targetUrl = process.argv.includes("--dev") ? devUrl : "data:text/html,<html><body>preload-test</body></html>";

  try {
    await win.loadURL(targetUrl);
  } catch (error) {
    console.error("loadFailed", targetUrl, error);
    app.quit();
    process.exit(1);
  }

  const hasApi = await win.webContents.executeJavaScript(
    "Boolean(window.api && window.api.auth && window.api.db)",
  );
  console.log("targetUrl", targetUrl);
  console.log("preloadPath", preloadPath);
  console.log("windowApiExposed", hasApi);

  app.quit();
  process.exit(hasApi ? 0 : 1);
});
