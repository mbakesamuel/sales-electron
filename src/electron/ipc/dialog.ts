import { BrowserWindow, dialog, ipcMain } from "electron";

function restoreFocus(webContents: Electron.WebContents): void {
  const win = BrowserWindow.fromWebContents(webContents);
  if (!win || win.isDestroyed()) {
    return;
  }
  // Windows: native TaskDialog can leave the renderer without keyboard focus.
  win.blur();
  win.focus();
  if (!webContents.isDestroyed()) {
    webContents.focus();
  }
}

function showConfirm(win: BrowserWindow | null, message: string): boolean {
  const options: Electron.MessageBoxSyncOptions = {
    type: "question",
    buttons: ["OK", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    title: "Confirm",
    message: String(message ?? ""),
  };
  const result = win
    ? dialog.showMessageBoxSync(win, options)
    : dialog.showMessageBoxSync(options);
  return result === 0;
}

function showAlert(win: BrowserWindow | null, message: string): void {
  const options: Electron.MessageBoxSyncOptions = {
    type: "info",
    buttons: ["OK"],
    defaultId: 0,
    noLink: true,
    title: "Notice",
    message: String(message ?? ""),
  };
  if (win) {
    dialog.showMessageBoxSync(win, options);
  } else {
    dialog.showMessageBoxSync(options);
  }
}

export function registerDialogHandlers(): void {
  ipcMain.on("dialog:confirm", (event, message: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    event.returnValue = showConfirm(win, message);
    restoreFocus(event.sender);
  });

  ipcMain.on("dialog:alert", (event, message: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    showAlert(win, message);
    event.returnValue = undefined;
    restoreFocus(event.sender);
  });
}
