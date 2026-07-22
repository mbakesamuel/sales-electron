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
  const [printing, setPrinting] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
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
    setPrintMessage(null);
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

  function handlePrint(): void {
    if (stack.length === 0 || printing) {
      return;
    }
    const missing = stack.filter((id) => data[id] == null);
    if (missing.length > 0) {
      setPrintMessage(`Still loading: ${missing.map(catalogLabel).join(", ")}`);
      return;
    }
    const failed = stack.filter((id) => errors[id]);
    if (failed.length > 0) {
      setPrintMessage(
        `Cannot print — failed reports: ${failed.map(catalogLabel).join(", ")}`,
      );
      return;
    }

    setPrinting(true);
    setPrintMessage(null);

    const htmlEl = document.documentElement;
    const previousTheme = htmlEl.getAttribute("data-theme");
    htmlEl.setAttribute("data-theme", "print");
    htmlEl.classList.add("scr-print-pack-mode");
    document.body.classList.add("scr-print-pack-mode");

    const cleanup = () => {
      htmlEl.classList.remove("scr-print-pack-mode");
      document.body.classList.remove("scr-print-pack-mode");
      if (previousTheme) {
        htmlEl.setAttribute("data-theme", previousTheme);
      } else {
        htmlEl.removeAttribute("data-theme");
      }
      setPrinting(false);
    };

    window.addEventListener("afterprint", cleanup, { once: true });

    // Allow display:none → block layout to settle at printable width before print.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
        });
      });
    });
  }

  const pendingIds = stack.filter((id) => data[id] == null && !errors[id]);
  const failedIds = stack.filter((id) => Boolean(errors[id]));
  const anyLoading = loadingIds.size > 0 || pendingIds.length > 0;
  const stackReady =
    stack.length > 0 &&
    stack.every((id) => data[id] != null) &&
    failedIds.length === 0 &&
    !anyLoading;

  const statusHint = printing
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
                  disabled={anyLoading || printing}
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
            disabled={!stackReady || printing}
            title={statusHint ?? "Print selected reports"}
            onClick={handlePrint}
          >
            {printing ? "Printing…" : "Print"}
          </button>
          {printMessage ? (
            <span class="wpp-export-msg">{printMessage}</span>
          ) : statusHint ? (
            <span class="wpp-export-msg">{statusHint}</span>
          ) : null}
        </div>

        <div class="wpp-stack-panel">
          <h2 class="wpp-stack-title">Print stack</h2>
          <p class="wpp-stack-hint">
            Check reports to include. Use up/down to set print order. Week
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
            <p class="scr-status">Select at least one report to print.</p>
          )}
        </div>
      </div>

      <div class="wpp-stack-preview wpp-print-source" aria-hidden="true">
        {stack.map((id) => {
          if (data[id] == null && !errors[id]) {
            return null;
          }
          if (errors[id]) {
            return null;
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
