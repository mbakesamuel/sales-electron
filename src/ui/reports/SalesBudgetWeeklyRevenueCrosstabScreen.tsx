import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDateTime } from "../../shared/formatDisplayDate.ts";
import type { SalesBudgetWeeklyRevenueCrosstabReport } from "../../shared/reports.types.ts";
import {
  CAL_MONTHS,
  formatPhasedAmountDisplay,
  monthName,
  salesBudgetCrosstabCellKey,
} from "../../shared/salesBudgetPhase.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import { salesBudgetWeeklyRevenueCrosstabEmptyMessage } from "./reportEmpty.ts";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";

interface SalesBudgetWeeklyRevenueCrosstabScreenProps {
  onNavigate?: (routeId: string) => void;
  windowMode?: boolean;
}

function handlePrint(): void {
  const style = document.createElement("style");
  style.id = "sbc-print-landscape-style";
  style.textContent = `@media print { @page { size: A4 landscape; margin: 6mm; } }`;
  document.head.appendChild(style);

  document.body.classList.add("scr-print-mode", "mdr-print-landscape");

  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("scr-print-mode", "mdr-print-landscape");
      style.remove();
    },
    { once: true },
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

export function buildAmountMap(
  report: SalesBudgetWeeklyRevenueCrosstabReport,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of report.amountByCell) {
    map.set(entry.key, entry.amountFcfa);
  }
  return map;
}

function buildCsv(
  report: SalesBudgetWeeklyRevenueCrosstabReport,
  amountMap: Map<string, number>,
): string {
  const monthHeaders = report.categoriesInReport.flatMap((cat) =>
    CAL_MONTHS.map((month) => `${cat.label} ${monthName(month)}`),
  );
  const lines = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `Calendar year:,${report.reportYear}`,
    "",
    ["ISO week", ...monthHeaders, "Row total"].join(","),
  ].filter((line) => line.length > 0);

  report.sortedWeeks.forEach((week, rowIndex) => {
    const values = report.cols.map((col) => {
      const key = salesBudgetCrosstabCellKey(week.label, col.productCatId, col.month);
      return amountMap.get(key) ?? 0;
    });
    lines.push([week.label, ...values, report.rowTotals[rowIndex] ?? 0].join(","));
  });

  lines.push(
    ["Column totals (XAF)", ...report.colTotals, report.grandTotal].join(","),
  );

  return lines.join("\n");
}

function downloadCsv(
  report: SalesBudgetWeeklyRevenueCrosstabReport,
  amountMap: Map<string, number>,
): void {
  const blob = new Blob([buildCsv(report, amountMap)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-budget-weekly-revenue-crosstab-${report.reportYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatGeneratedAt(iso: string): string {
  return formatDisplayDateTime(iso);
}

export function SalesBudgetWeeklyRevenueCrosstabScreen({
  onNavigate,
  windowMode = false,
}: SalesBudgetWeeklyRevenueCrosstabScreenProps) {
  const [report, setReport] = useState<SalesBudgetWeeklyRevenueCrosstabReport | null>(null);
  const [reportYear, setReportYear] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAuthenticatedReports()
      .getSalesBudgetWeeklyRevenueCrosstab(reportYear ?? undefined)
      .then((data) => {
        if (!cancelled) {
          setReport(data);
          setReportYear(data.reportYear);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load report.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reportYear, reloadKey]);

  const amountMap = useMemo(() => (report ? buildAmountMap(report) : new Map()), [report]);

  if (loading && !report) {
    return <p class="scr-status">Loading sales budget weekly revenue crosstab…</p>;
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data.</p>;
  }

  return (
    <div class="scr-page sbc-root" data-print-page="sales-budget-weekly-revenue-crosstab">
      <div class="sbc-toolbar no-print">
        <div class="sbc-year-picker">
          {report.yearChoices.map((year) => (
            <button
              key={year}
              type="button"
              class={`sbc-year-btn${year === report.reportYear ? " is-active" : ""}`}
              onClick={() => setReportYear(year)}
            >
              {year}
            </button>
          ))}
        </div>

        <div class="scr-toolbar-actions sbc-actions">
          <button type="button" class="scr-btn" onClick={() => handlePrint()}>
            Print
          </button>
          {windowMode ? (
            <ReportWindowSaveButton
              fileName={`sales-budget-weekly-revenue-${report.reportYear}.pdf`}
            />
          ) : null}
          <button
            type="button"
            class="scr-btn"
            onClick={() => downloadCsv(report, amountMap)}
          >
            Export CSV
          </button>
          <ReportCommentsEditor
            reportId="sales-budget-weekly-revenue-crosstab"
            comments={report.comments}
            onSaved={() => setReloadKey((value) => value + 1)}
          />
          <button
            type="button"
            class="scr-btn"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Refresh
          </button>
        </div>
      </div>

      <ReportDocumentShell
        className="scr-document wpp-pack-page wpp-pack-crosstab"
        isEmpty={salesBudgetWeeklyRevenueCrosstabEmptyMessage(report) !== null}
        emptyMessage={salesBudgetWeeklyRevenueCrosstabEmptyMessage(report) ?? ""}
        comments={report.comments}
        signatoryName={report.settings.signatoryName}
        signatoryTitle={report.settings.signatoryTitle}
        header={
          <ReportHeader
            companyName={report.settings.companyName}
            department={report.settings.department}
            serviceName={report.settings.serviceName}
            title="Sales budget — weekly phasing crosstab (XAF)"
          />
        }
      >
        <div>
          <p class="sbc-intro">
            Calendar year <strong>{report.reportYear}</strong>. Rows are ISO weeks; columns are
            budget group × calendar month. Each cell is phased budget revenue (XAF) for days in that
            week within that month (from Sales budgets).{" "}
            {onNavigate ? (
              <>
                <button
                  type="button"
                  class="sbc-link-btn"
                  onClick={() => onNavigate("sales-budget-monthly-revenue-crosstab")}
                >
                  Monthly revenue phasing crosstab
                </button>
                {" · "}
                <button
                  type="button"
                  class="sbc-link-btn"
                  onClick={() => onNavigate("sales-budget-weekly-crosstab")}
                >
                  Weekly kg phasing crosstab
                </button>
              </>
            ) : (
              "See also the monthly revenue and weekly kg phasing crosstabs."
            )}
            .
          </p>
          <p class="sbc-intro-meta">Generated {formatGeneratedAt(report.generatedAtIso)}</p>
        </div>

        <div class="sbc-table-wrap">
          <table class="sbc-table sbc-table-weekly">
              <thead>
                <tr>
                  <th rowSpan={2} class="sbc-sticky-col sbc-week-col">
                    ISO week
                  </th>
                  {report.categoriesInReport.map((cat) => (
                    <th
                      key={cat.productCatId}
                      colSpan={12}
                      class="sbc-product-group"
                    >
                      {cat.label}
                    </th>
                  ))}
                  <th rowSpan={2} class="sbc-num sbc-total-col">
                    Row total
                  </th>
                </tr>
                <tr>
                  {report.categoriesInReport.map((cat) =>
                    CAL_MONTHS.map((month) => (
                      <th
                        key={`${cat.productCatId}-${month}`}
                        class="sbc-num sbc-month-head"
                        title={monthName(month)}
                      >
                        {monthName(month).slice(0, 3)}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {report.sortedWeeks.map((week, rowIndex) => {
                  const rowTotal = report.rowTotals[rowIndex] ?? 0;
                  return (
                    <tr key={week.label}>
                      <td class="sbc-sticky-col sbc-week-col">{week.label}</td>
                      {report.cols.map((col) => {
                        const amount =
                          amountMap.get(
                            salesBudgetCrosstabCellKey(
                              week.label,
                              col.productCatId,
                              col.month,
                            ),
                          ) ?? 0;
                        return (
                          <td
                            key={`${col.productCatId}-${col.month}`}
                            class={`sbc-num sbc-month-head${amount === 0 ? " sbc-zero" : ""}`}
                          >
                            {amount === 0 ? "—" : formatPhasedAmountDisplay(amount)}
                          </td>
                        );
                      })}
                      <td class={`sbc-num sbc-total-col${rowTotal === 0 ? " sbc-zero" : ""}`}>
                        {rowTotal === 0 ? "—" : formatPhasedAmountDisplay(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr class="sbc-foot">
                  <td class="sbc-sticky-col sbc-week-col">Column totals (XAF)</td>
                  {report.colTotals.map((value, index) => (
                    <td
                      key={index}
                      class={`sbc-num sbc-month-head${value === 0 ? " sbc-zero" : ""}`}
                    >
                      {value === 0 ? "—" : formatPhasedAmountDisplay(value)}
                    </td>
                  ))}
                  <td class={`sbc-num sbc-total-col${report.grandTotal === 0 ? " sbc-zero" : ""}`}>
                    {report.grandTotal === 0 ? "—" : formatPhasedAmountDisplay(report.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
      </ReportDocumentShell>
    </div>
  );
}
