import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { canAccessRouteFromSnapshot } from "../../shared/permissionUtils.ts";
import type {
  BottleOilStockSalesReport,
  BottledWeeklyIssuesReport,
  CommitmentReport,
  SalesBudgetWeeklyCrosstabReport,
  StockCommitmentReport,
  StockReport,
  WeeklyDeliveriesReport,
  WeeklyDeliveriesWeekChoice,
} from "../../shared/reports.types.ts";
import { getAuthenticatedReports } from "../auth/reports.ts";
import {
  BottleOilStockSalesReportDocument,
} from "./BottleOilStockSalesReportScreen.tsx";
import {
  BottledWeeklyIssuesReportDocument,
} from "./BottledWeeklyIssuesReportScreen.tsx";
import { CommitmentReportDocument } from "./CommitmentReportScreen.tsx";
import {
  buildQtyMap,
  SalesBudgetWeeklyCrosstabDocument,
} from "./SalesBudgetWeeklyCrosstabScreen.tsx";
import { StockCommitmentReportDocument } from "./StockCommitmentReport.tsx";
import { StockReportDocument } from "./StockReportScreen.tsx";
import { WeeklyDeliveriesReportDocument } from "./WeeklyDeliveriesReportScreen.tsx";
import "./StockCommitmentReport.css";
import "./BottledWeeklyIssuesReport.css";
import "./SalesBudgetCrosstab.css";
import "./WeeklyPrintPack.css";

export type WeeklyPrintPackReportId =
  | "stock-commitment-report"
  | "stock-report"
  | "commitment-report"
  | "bottle-oil-stock-sales-report"
  | "bottled-weekly-issues-report"
  | "sales-delivery-report"
  | "sales-budget-weekly-crosstab";

interface PackCatalogEntry {
  id: WeeklyPrintPackReportId;
  label: string;
}

const PACK_CATALOG: PackCatalogEntry[] = [
  { id: "stock-commitment-report", label: "Stock & commitment" },
  { id: "stock-report", label: "Stock report" },
  { id: "commitment-report", label: "Commitment report" },
  { id: "bottle-oil-stock-sales-report", label: "Bottle oil stock & sales" },
  { id: "bottled-weekly-issues-report", label: "Bottled weekly issues" },
  { id: "sales-delivery-report", label: "Sales / delivery report" },
  { id: "sales-budget-weekly-crosstab", label: "Sales budget (weekly)" },
];

type PackData = {
  "stock-commitment-report"?: StockCommitmentReport;
  "stock-report"?: StockReport;
  "commitment-report"?: CommitmentReport;
  "bottle-oil-stock-sales-report"?: BottleOilStockSalesReport;
  "bottled-weekly-issues-report"?: BottledWeeklyIssuesReport;
  "sales-delivery-report"?: WeeklyDeliveriesReport;
  "sales-budget-weekly-crosstab"?: SalesBudgetWeeklyCrosstabReport;
};

function catalogLabel(id: WeeklyPrintPackReportId): string {
  return PACK_CATALOG.find((entry) => entry.id === id)?.label ?? id;
}

const WEEKLY_PACK_IDS: WeeklyPrintPackReportId[] = [
  "bottled-weekly-issues-report",
  "sales-delivery-report",
];

async function fetchReport(
  id: WeeklyPrintPackReportId,
  weekMondayIso?: string,
): Promise<PackData[WeeklyPrintPackReportId]> {
  const api = getAuthenticatedReports();
  switch (id) {
    case "stock-commitment-report":
      return api.getStockCommitment();
    case "stock-report":
      return api.getStockReport();
    case "commitment-report":
      return api.getCommitmentReport();
    case "bottle-oil-stock-sales-report":
      return api.getBottleOilStockSales();
    case "bottled-weekly-issues-report": {
      let basis: "working-days" | "iso-week" = "working-days";
      try {
        const stored = localStorage.getItem("bwi-estimate-basis");
        if (stored === "iso-week") basis = "iso-week";
      } catch {
        /* ignore */
      }
      return api.getBottledWeeklyIssues(basis, weekMondayIso);
    }
    case "sales-delivery-report":
      return api.getWeeklyDeliveries(weekMondayIso);
    case "sales-budget-weekly-crosstab":
      return api.getSalesBudgetWeeklyCrosstab();
  }
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function sameIdList(
  left: readonly WeeklyPrintPackReportId[],
  right: readonly WeeklyPrintPackReportId[],
): boolean {
  return (
    left.length === right.length && left.every((id, index) => id === right[index])
  );
}

interface WeeklyPrintPackScreenProps {
  permissions: RolePermissionsSnapshot;
}

export function WeeklyPrintPackScreen({ permissions }: WeeklyPrintPackScreenProps) {
  const available = useMemo(
    () =>
      PACK_CATALOG.filter((entry) =>
        canAccessRouteFromSnapshot(permissions, entry.id),
      ),
    [permissions],
  );

  const [stack, setStack] = useState<WeeklyPrintPackReportId[]>([]);
  const [data, setData] = useState<PackData>({});
  const [loadingIds, setLoadingIds] = useState<Set<WeeklyPrintPackReportId>>(
    () => new Set(),
  );
  const [errors, setErrors] = useState<Partial<Record<WeeklyPrintPackReportId, string>>>(
    {},
  );
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [weekChoices, setWeekChoices] = useState<WeeklyDeliveriesWeekChoice[]>([]);
  const [weekMondayIso, setWeekMondayIso] = useState<string | undefined>(undefined);
  const [weekReady, setWeekReady] = useState(false);
  const startedRef = useRef<Set<WeeklyPrintPackReportId>>(new Set());
  const stackSeeded = useRef(false);
  const prevWeekRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getAuthenticatedReports()
      .getWeekChoices()
      .then((result) => {
        if (cancelled) return;
        setWeekChoices(result.weekChoices);
        setWeekMondayIso(result.defaultWeekMondayIso ?? undefined);
        setWeekReady(true);
      })
      .catch(() => {
        if (!cancelled) setWeekReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const allowedIds = available.map((entry) => entry.id);
    if (!stackSeeded.current) {
      stackSeeded.current = true;
      setStack(allowedIds);
      return;
    }
    setStack((prev) => {
      const allowed = new Set(allowedIds);
      const kept = prev.filter((id) => allowed.has(id));
      if (kept.length > 0) {
        return sameIdList(kept, prev) ? prev : kept;
      }
      return sameIdList(allowedIds, prev) ? prev : allowedIds;
    });
  }, [available]);

  useEffect(() => {
    if (!weekReady) {
      return;
    }
    if (prevWeekRef.current === weekMondayIso) {
      return;
    }
    const isFirst = prevWeekRef.current === undefined && weekMondayIso !== undefined;
    prevWeekRef.current = weekMondayIso;
    if (isFirst) {
      return;
    }
    for (const id of WEEKLY_PACK_IDS) {
      startedRef.current.delete(id);
    }
    setData((prev) => {
      const next = { ...prev };
      for (const id of WEEKLY_PACK_IDS) {
        delete next[id];
      }
      return next;
    });
  }, [weekMondayIso, weekReady]);

  useEffect(() => {
    if (!weekReady) {
      return;
    }
    const toLoad = stack.filter((id) => !startedRef.current.has(id));
    if (toLoad.length === 0) {
      return;
    }

    for (const id of toLoad) {
      startedRef.current.add(id);
    }

    setLoadingIds((prev) => {
      const next = new Set(prev);
      for (const id of toLoad) {
        next.add(id);
      }
      return next;
    });

    for (const id of toLoad) {
      void (async () => {
        try {
          const report = await fetchReport(id, weekMondayIso);
          setData((prev) => ({ ...prev, [id]: report }));
          setErrors((prev) => {
            if (!prev[id]) {
              return prev;
            }
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } catch (loadError) {
          startedRef.current.delete(id);
          setErrors((prev) => ({
            ...prev,
            [id]:
              loadError instanceof Error
                ? loadError.message
                : "Failed to load report.",
          }));
        } finally {
          setLoadingIds((prev) => {
            if (!prev.has(id)) {
              return prev;
            }
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      })();
    }
  }, [stack, weekMondayIso, weekReady]);

  const selectedSet = useMemo(() => new Set(stack), [stack]);

  function toggleReport(id: WeeklyPrintPackReportId, checked: boolean): void {
    setExportMessage(null);
    setStack((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  }

  function moveUp(index: number): void {
    setStack((prev) => moveItem(prev, index, index - 1));
  }

  function moveDown(index: number): void {
    setStack((prev) => moveItem(prev, index, index + 1));
  }

  async function handleExportPdf(): Promise<void> {
    if (stack.length === 0 || exporting) {
      return;
    }
    const missing = stack.filter((id) => data[id] == null);
    if (missing.length > 0) {
      setExportMessage(`Still loading: ${missing.map(catalogLabel).join(", ")}`);
      return;
    }
    const failed = stack.filter((id) => errors[id]);
    if (failed.length > 0) {
      setExportMessage(
        `Cannot export — failed reports: ${failed.map(catalogLabel).join(", ")}`,
      );
      return;
    }
    if (!window.api?.print?.exportPdf) {
      setExportMessage("PDF export is unavailable. Restart the app and try again.");
      return;
    }

    setExporting(true);
    setExportMessage(null);

    const htmlEl = document.documentElement;
    const previousTheme = htmlEl.getAttribute("data-theme");
    htmlEl.setAttribute("data-theme", "print");
    htmlEl.classList.add("scr-print-pack-mode");
    document.body.classList.add("scr-print-pack-mode");

    let pageStyle = document.getElementById("wpp-a4-page-style");
    if (!pageStyle) {
      pageStyle = document.createElement("style");
      pageStyle.id = "wpp-a4-page-style";
      /* Formal print: white paper, #333 grid, soft green on totals only */
      pageStyle.textContent = `
        @page { size: A4 portrait; margin: 14mm; }
        html[data-theme="print"], html.scr-print-pack-mode {
          color-scheme: light !important;
          --bg: #fff; --bg-elevated: #fff; --bg-soft: #fff;
          --text: #111; --text-h: #111; --text-muted: #444;
          --shell-content: #fff; --shell-main: #fff; --shell-header: #fff;
          --border: #333; --accent: #111; --accent-soft: #fff; --highlight-bg: #fff;
        }
        html.scr-print-pack-mode,
        html.scr-print-pack-mode body,
        html.scr-print-pack-mode #app,
        html.scr-print-pack-mode .home-content,
        html.scr-print-pack-mode .home-main,
        html.scr-print-pack-mode .home-layout,
        html.scr-print-pack-mode .wpp-pack-page,
        html.scr-print-pack-mode .scr-document {
          background: #fff !important;
          background-image: none !important;
          color: #111 !important;
          font-family: Arial, sans-serif !important;
        }
        html.scr-print-pack-mode .wpp-pack-page .report-header,
        html.scr-print-pack-mode .wpp-pack-page .report-header * {
          background: #fff !important;
          color: #111 !important;
          box-shadow: none !important;
        }
        html.scr-print-pack-mode .wpp-pack-page .report-header {
          border: none !important;
          border-bottom: 2px solid #111 !important;
        }
        html.scr-print-pack-mode .wpp-pack-page .report-header-logo-placeholder {
          border: 1px solid #ccc !important;
          background: #fff !important;
        }
        html.scr-print-pack-mode .wpp-pack-page .scr-as-at-date,
        html.scr-print-pack-mode .wpp-pack-page .report-header-meta,
        html.scr-print-pack-mode .wpp-pack-page .report-header-department,
        html.scr-print-pack-mode .wpp-pack-page .report-header-commercial-service {
          color: #444 !important;
        }
        html.scr-print-pack-mode .wpp-pack-page .scr-table,
        html.scr-print-pack-mode .wpp-pack-page .sbc-table {
          border-collapse: collapse !important;
          background: #fff !important;
        }
        html.scr-print-pack-mode .wpp-pack-page .scr-table th,
        html.scr-print-pack-mode .wpp-pack-page .scr-table td,
        html.scr-print-pack-mode .wpp-pack-page .sbc-table th,
        html.scr-print-pack-mode .wpp-pack-page .sbc-table td,
        html.scr-print-pack-mode .home-content .wpp-pack-page .scr-table th,
        html.scr-print-pack-mode .home-content .wpp-pack-page .scr-table td,
        html.scr-print-pack-mode .wpp-pack-page .scr-section-title,
        html.scr-print-pack-mode .wpp-pack-page .scr-row-header td {
          border: 1px solid #333 !important;
          color: #111 !important;
          background: #fff !important;
          padding: 4px 6px !important;
        }
        html.scr-print-pack-mode .wpp-pack-page .scr-row-total td,
        html.scr-print-pack-mode .wpp-pack-page .scr-total-cell,
        html.scr-print-pack-mode .wpp-pack-page .sbc-foot td {
          background: #eef4df !important;
          font-weight: 700 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html.scr-print-pack-mode .wpp-pack-page .report-header,
        html.scr-print-pack-mode .wpp-pack-page .report-footer,
        html.scr-print-pack-mode .wpp-pack-page .scr-row-total,
        html.scr-print-pack-mode .wpp-pack-page .sbc-foot,
        html.scr-print-pack-mode .wpp-pack-page tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        html.scr-print-pack-mode .wpp-pack-page thead {
          display: table-header-group;
        }
        html.scr-print-pack-mode .wpp-pack-page .scr-bottled-block {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        html.scr-print-pack-mode .wpp-pack-page .scr-bottled-block + .scr-bottled-block {
          break-before: page;
          page-break-before: always;
        }
      `;
      document.head.appendChild(pageStyle);
    }

    const content = document.querySelector(".home-content");
    if (content instanceof HTMLElement) {
      content.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
      await new Promise((resolve) => setTimeout(resolve, 200));
      const dateStamp = new Date().toISOString().slice(0, 10);
      const result = await window.api.print.exportPdf(
        `weekly-print-pack-${dateStamp}.pdf`,
      );
      if (result.ok) {
        setExportMessage(`Saved: ${result.filePath}`);
      } else if (result.cancelled) {
        setExportMessage(null);
      } else {
        setExportMessage(result.error);
      }
    } catch (error) {
      setExportMessage(
        error instanceof Error ? error.message : "Failed to export PDF.",
      );
    } finally {
      document.getElementById("wpp-a4-page-style")?.remove();
      htmlEl.classList.remove("scr-print-pack-mode");
      document.body.classList.remove("scr-print-pack-mode");
      if (previousTheme) {
        htmlEl.setAttribute("data-theme", previousTheme);
      } else {
        htmlEl.removeAttribute("data-theme");
      }
      setExporting(false);
    }
  }

  const pendingIds = stack.filter((id) => data[id] == null && !errors[id]);
  const failedIds = stack.filter((id) => Boolean(errors[id]));
  const anyLoading = loadingIds.size > 0 || pendingIds.length > 0;
  const stackReady =
    stack.length > 0 &&
    stack.every((id) => data[id] != null) &&
    failedIds.length === 0 &&
    !anyLoading;

  const statusHint = exporting
    ? null
    : stack.length === 0
      ? "Select at least one report."
      : failedIds.length > 0
        ? `Fix failed reports: ${failedIds.map(catalogLabel).join(", ")}`
        : anyLoading
          ? `Loading ${pendingIds.map(catalogLabel).join(", ") || "reports"}…`
          : null;

  return (
    <div class="scr-page wpp-page">
      <div class="wpp-controls no-print">
        <div class="wpp-toolbar">
          {weekChoices.length > 0 ? (
            <div class="sbc-year-picker" aria-label="Week in open month">
              {weekChoices.map((week) => (
                <button
                  key={week.weekMondayIso}
                  type="button"
                  class={`sbc-year-btn${week.weekMondayIso === weekMondayIso ? " is-active" : ""}`}
                  disabled={anyLoading || exporting}
                  onClick={() => setWeekMondayIso(week.weekMondayIso)}
                >
                  {week.label}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            class="scr-btn"
            disabled={!stackReady || exporting}
            title={statusHint ?? "Export selected reports as one PDF"}
            onClick={() => {
              void handleExportPdf();
            }}
          >
            {exporting ? "Exporting…" : "Export PDF"}
          </button>
          {exportMessage ? (
            <span class="wpp-export-msg">{exportMessage}</span>
          ) : statusHint ? (
            <span class="wpp-export-msg">{statusHint}</span>
          ) : null}
        </div>

        <div class="wpp-stack-panel">
          <h2 class="wpp-stack-title">Print stack</h2>
          <p class="wpp-stack-hint">
            Check reports to include. Use up/down to set PDF page order. Week
            buttons apply to Sales/delivery and Bottled weekly issues.
          </p>
          <ul class="wpp-catalog">
            {available.map((entry) => (
              <li key={entry.id} class="wpp-catalog-item">
                <label class="wpp-check-label">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(entry.id)}
                    onChange={(event) => {
                      toggleReport(entry.id, event.currentTarget.checked);
                    }}
                  />
                  <span>{entry.label}</span>
                </label>
              </li>
            ))}
          </ul>

          {stack.length > 0 ? (
            <ol class="wpp-order-list">
              {stack.map((id, index) => {
                const entry = PACK_CATALOG.find((item) => item.id === id);
                return (
                  <li key={id} class="wpp-order-item">
                    <span class="wpp-order-label">{entry?.label ?? id}</span>
                    <span class="wpp-order-actions">
                      <button
                        type="button"
                        class="scr-btn scr-btn-secondary wpp-order-btn"
                        disabled={index === 0}
                        onClick={() => moveUp(index)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        class="scr-btn scr-btn-secondary wpp-order-btn"
                        disabled={index === stack.length - 1}
                        onClick={() => moveDown(index)}
                      >
                        Down
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p class="scr-status">Select at least one report to export.</p>
          )}
        </div>
      </div>

      <div class="wpp-stack-preview">
        {stack.map((id) => {
          if (data[id] == null && !errors[id]) {
            return (
              <p key={id} class="scr-status no-print">
                Loading {catalogLabel(id)}…
              </p>
            );
          }
          if (errors[id]) {
            return (
              <p key={id} class="scr-status scr-status-error no-print">
                {catalogLabel(id)}: {errors[id]}
              </p>
            );
          }
          const report = data[id];
          if (!report) {
            return null;
          }
          switch (id) {
            case "stock-commitment-report":
              return (
                <StockCommitmentReportDocument
                  key={id}
                  report={report as StockCommitmentReport}
                />
              );
            case "stock-report":
              return <StockReportDocument key={id} report={report as StockReport} />;
            case "commitment-report":
              return (
                <CommitmentReportDocument
                  key={id}
                  report={report as CommitmentReport}
                />
              );
            case "bottle-oil-stock-sales-report":
              return (
                <BottleOilStockSalesReportDocument
                  key={id}
                  report={report as BottleOilStockSalesReport}
                />
              );
            case "bottled-weekly-issues-report":
              return (
                <BottledWeeklyIssuesReportDocument
                  key={id}
                  report={report as BottledWeeklyIssuesReport}
                />
              );
            case "sales-delivery-report":
              return (
                <WeeklyDeliveriesReportDocument
                  key={id}
                  report={report as WeeklyDeliveriesReport}
                />
              );
            case "sales-budget-weekly-crosstab": {
              const weekly = report as SalesBudgetWeeklyCrosstabReport;
              return (
                <SalesBudgetWeeklyCrosstabDocument
                  key={id}
                  report={weekly}
                  qtyMap={buildQtyMap(weekly)}
                />
              );
            }
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
