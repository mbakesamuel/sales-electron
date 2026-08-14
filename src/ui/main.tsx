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

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app root");
}

// Mark that the module bundle executed (static HTML shell watches for this).
root.dataset.boot = "js-loaded";

try {
  installNativeDialogWorkaround();
  // Clear the static boot shell first. Preact diffs against existing #app
  // children; leaving the shell in place morphs it into Login/Home and
  // leaves a distorted layout that still looks like "loading".
  root.replaceChildren();
  render(<App />, root);
  root.dataset.boot = "mounted";
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Failed to mount app:", error);
  root.innerHTML = `<div class="boot-shell" role="alert"><div class="boot-shell-inner"><h1 class="boot-shell-title">Startup error</h1><p class="boot-shell-status">${message}</p></div></div>`;
}
