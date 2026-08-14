interface AppLoadingShellProps {
  status?: string;
  error?: boolean;
}

/** Branded bootstrap / report-window loading state (replaces static index.html shell). */
export function AppLoadingShell({
  status = "Starting…",
  error = false,
}: AppLoadingShellProps) {
  return (
    <main
      class={`app-loading${error ? " scr-status-error" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div class="app-loading-inner">
        {!error ? (
          <div class="app-loading-spinner" aria-hidden="true" />
        ) : null}
        <h1 class="app-loading-title">Sales Management</h1>
        <p class="app-loading-status">{status}</p>
      </div>
    </main>
  );
}
