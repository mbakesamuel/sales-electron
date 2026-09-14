import { EventEmitter } from "node:events";

export class NetworkMonitor extends EventEmitter {
  private isOnline = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private serverUrl: string;

  constructor(serverUrl = "http://localhost:3001") {
    super();
    this.serverUrl = serverUrl.replace(/\/+$/, "");
  }

  public setServerUrl(url: string): void {
    this.serverUrl = url.replace(/\/+$/, "");
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async checkHealth(timeoutMs = 4000): Promise<{
    ok: boolean;
    latencyMs?: number;
    serverVersion?: string;
    error?: string;
  }> {
    if (!this.serverUrl) {
      return { ok: false, error: "Server URL is not configured." };
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${this.serverUrl}/api/health`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          version?: string;
        };
        this.updateState(true);
        return {
          ok: true,
          latencyMs,
          serverVersion: data.version ?? "1.0.0",
        };
      }

      this.updateState(false);
      return {
        ok: false,
        latencyMs,
        error: `Server returned status HTTP ${res.status}`,
      };
    } catch (err: unknown) {
      this.updateState(false);
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  }

  private updateState(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;
      this.emit("change", this.isOnline);
      if (online) {
        this.emit("online");
      } else {
        this.emit("offline");
      }
    }
  }

  public startPolling(intervalMs = 30_000): void {
    this.stopPolling();
    void this.checkHealth();
    this.checkInterval = setInterval(() => {
      void this.checkHealth();
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
