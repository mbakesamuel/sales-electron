import { useEffect, useRef, useState } from "preact/hooks";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
  BarController,
  BarElement,
} from "chart.js";
import { getAuthenticatedDashboard } from "../auth/dashboard.ts";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { DashboardSummary } from "../../shared/dashboard.types.ts";
import "./DashboardScreen.css";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
  PieController,
  ArcElement,
  BarController,
  BarElement,
);

const CHART_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#4b5563",
];

function formatMoney(value: number): string {
  return Math.round(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function readCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function DashboardScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const lineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartsRef = useRef<{
    line?: Chart;
    pie?: Chart;
    bar?: Chart;
  }>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setError("Dashboard is taking too long to load.");
        setLoading(false);
      }
    }, 15000);

    getAuthenticatedDashboard()
      .getSummary()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard.");
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [reloadKey]);

  useEffect(() => {
    const textColor = readCssVar("--text-h", "#111827");
    const mutedColor = readCssVar("--text-muted", "#6b7280");
    const gridColor = readCssVar("--border", "#e5e7eb");
    const accent = readCssVar("--accent", "#2563eb");

    function destroyCharts() {
      chartsRef.current.line?.destroy();
      chartsRef.current.pie?.destroy();
      chartsRef.current.bar?.destroy();
      chartsRef.current = {};
    }

    destroyCharts();

    if (!summary?.hasOpenPeriod) {
      return destroyCharts;
    }

    if (lineCanvasRef.current) {
      const labels =
        summary.revenueByDay.length > 0
          ? summary.revenueByDay.map((row) => formatDisplayDate(row.dateIso))
          : ["No sales"];
      const values =
        summary.revenueByDay.length > 0
          ? summary.revenueByDay.map((row) => row.amount)
          : [0];

      chartsRef.current.line = new Chart(lineCanvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Revenue (XAF)",
              data: values,
              borderColor: accent,
              backgroundColor: "rgba(37, 99, 235, 0.12)",
              fill: true,
              tension: 0.25,
              pointRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${formatMoney(Number(ctx.raw ?? 0))} XAF`,
              },
            },
          },
          scales: {
            x: {
              ticks: { color: mutedColor, maxRotation: 0 },
              grid: { color: gridColor },
            },
            y: {
              ticks: {
                color: mutedColor,
                callback: (value) => formatMoney(Number(value)),
              },
              grid: { color: gridColor },
            },
          },
        },
      });
    }

    if (pieCanvasRef.current) {
      const cats = summary.revenueByCategory;
      chartsRef.current.pie = new Chart(pieCanvasRef.current, {
        type: "pie",
        data: {
          labels: cats.length > 0 ? cats.map((c) => c.label) : ["No sales"],
          datasets: [
            {
              data: cats.length > 0 ? cats.map((c) => c.amount) : [1],
              backgroundColor:
                cats.length > 0
                  ? cats.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]!)
                  : ["#d1d5db"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: window.innerWidth < 900 ? "bottom" : "right",
              labels: { color: textColor, boxWidth: 10, font: { size: 11 } },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  if (cats.length === 0) {
                    return " No data";
                  }
                  return ` ${formatMoney(Number(ctx.raw ?? 0))} XAF`;
                },
              },
            },
          },
        },
      });
    }

    if (barCanvasRef.current) {
      const months = summary.doVsSalesByMonth;
      chartsRef.current.bar = new Chart(barCanvasRef.current, {
        type: "bar",
        data: {
          labels: months.map((m) => m.label),
          datasets: [
            {
              label: "Delivery orders (kg)",
              data: months.map((m) => m.doQtyKg),
              backgroundColor: "#059669",
            },
            {
              label: "Sales (kg)",
              data: months.map((m) => m.salesQtyKg),
              backgroundColor: accent,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { color: textColor, boxWidth: 12 },
            },
            tooltip: {
              callbacks: {
                label: (ctx) =>
                  ` ${ctx.dataset.label}: ${Math.round(Number(ctx.raw ?? 0)).toLocaleString()} kg`,
              },
            },
          },
          scales: {
            x: {
              ticks: { color: mutedColor },
              grid: { display: false },
            },
            y: {
              ticks: {
                color: mutedColor,
                callback: (value) => Number(value).toLocaleString(),
              },
              grid: { color: gridColor },
            },
          },
        },
      });
    }

    return destroyCharts;
  }, [summary]);

  useEffect(() => {
    const root = document.querySelector(".dash-root");
    if (!root || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      chartsRef.current.line?.resize();
      chartsRef.current.pie?.resize();
      chartsRef.current.bar?.resize();
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [summary?.hasOpenPeriod]);

  if (loading && !summary) {
    return <p class="dash-status">Loading dashboard…</p>;
  }

  if (error && !summary) {
    return <p class="dash-status dash-status-error">{error}</p>;
  }

  if (!summary) {
    return <p class="dash-status">No dashboard data.</p>;
  }

  if (!summary.hasOpenPeriod || !summary.openMonth) {
    return (
      <div class="dash-empty">
        <h2>Overview</h2>
        <p>Open a financial year and month to see sales and delivery charts.</p>
        <button
          type="button"
          class="dash-refresh"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div class="dash-root">
      <div class="dash-toolbar">
        <div>
          <h2 class="dash-title">Overview</h2>
          <p class="dash-subtitle">
            {summary.openMonth.label}
            {summary.openYear != null ? ` · FY ${summary.openYear}` : ""}
            {" · "}
            as at {formatDisplayDate(summary.asAtIso)}
          </p>
        </div>
        <button
          type="button"
          class="dash-refresh"
          disabled={loading}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p class="dash-status dash-status-error">{error}</p> : null}

      <div class="dash-sections">
        <section class="dash-section">
          <h3 class="dash-section-title">Sales revenue — open month</h3>
          <p class="dash-section-meta">Daily validated invoice totals (gross XAF)</p>
          <div class="dash-chart dash-chart-line">
            <canvas ref={lineCanvasRef} />
          </div>
        </section>

        <section class="dash-section">
          <h3 class="dash-section-title">Sales by product category — open month</h3>
          <p class="dash-section-meta">Validated line net share by category</p>
          <div class="dash-chart dash-chart-pie">
            <canvas ref={pieCanvasRef} />
          </div>
        </section>

        <section class="dash-section">
          <h3 class="dash-section-title">
            Delivery orders vs sales — FY {summary.openYear}
          </h3>
          <p class="dash-section-meta">
            Validated DO ordered kg vs validated sales kg by calendar month
          </p>
          <div class="dash-chart dash-chart-bar">
            <canvas ref={barCanvasRef} />
          </div>
        </section>
      </div>
    </div>
  );
}
