import { Component, type ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}

interface State {
  error: string | null;
}

/** Catches render errors in the signed-in shell so login success never looks like a hung boot screen. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error("App render error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <main class="app-loading scr-status-error" role="alert">
          <div class="app-loading-inner">
            <h1 class="app-loading-title">Something went wrong</h1>
            <p class="app-loading-status">{this.state.error}</p>
            <button
              type="button"
              style="margin-top: 12px; padding: 8px 14px; border-radius: 6px; border: 1px solid #ccc; cursor: pointer;"
              onClick={() => {
                this.setState({ error: null });
                window.location.hash = "";
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
