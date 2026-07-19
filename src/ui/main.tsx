import { render } from "preact";
import "./index.css";
import { App } from "./app.tsx";

/**
 * Electron on Windows loses keyboard focus after native window.confirm/alert.
 * Route those through Electron's dialog API and restore focus afterward.
 */
function installNativeDialogWorkaround(): void {
  const api = window.api?.dialog;
  if (!api?.confirm || !api?.alert) {
    return;
  }

  window.confirm = (message?: string) => api.confirm(String(message ?? ""));
  window.alert = (message?: unknown) => {
    api.alert(String(message ?? ""));
  };
}

installNativeDialogWorkaround();

render(<App />, document.getElementById("app")!);
