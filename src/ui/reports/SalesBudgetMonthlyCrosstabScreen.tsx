import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDateTime } from "../../shared/formatDisplayDate.ts";
import type { SalesBudgetMonthlyCrosstabReport } from "../../shared/reports.types.ts";
import {
  CAL_MONTHS,
  formatPhasedQtyKgDisplay,
  monthName,
} from "../../shared/salesBudgetPhase.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";

interface SalesBudgetMonthlyCrosstabScreenProps {
  onNavigate?: (routeId: string) => void;
}

function handlePrint(landscape = false): void {
  let style: HTMLStyleElement | null = null;
  if (landscape) {
    style = document.createElement("style");
    style.id = "sbc-print-landscape-style";
    style.textContent = `@media print { @page { size: A4 landscape; margin: 6mm; } }`;
    document.head.appendChild(style);
  }

  document.body.classList.add("scr-print-mode");
  if (landscape) {
    document.body.classList.add("mdr-print-landscape");
  }

  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("scr-print-mode", "mdr-print-landscape");
      style?.remove();
    },
    { once: true },
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

function buildCsv(report: SalesBudgetMonthlyCrosstabReport): string {
  const header = [
    "Budget group",
    ...CAL_MONTHS.map((month) => monthName(month)),
    "Total",
  ];
  const lines = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `Calendar year:,${report.reportYear}`,
    "",
    header.join(","),
  ].filter((line) => line.length > 0);

  for (const row of report.rows) {
    lines.push(
      [
        `"${row.label.replace(/"/g, '""')}"`,
        ...row.cells.map((value) => value),
        row.rowTotal,
      ].join(","),
    );
  }

  lines.push(
    [
      "Column totals (kg)",
      ...report.colTotals.map((value) => value),
      report.grandTotal,
    ].join(","),
  );

  return lines.join("\n");
}

function downloadCsv(report: SalesBudgetMonthlyCrosstabReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-budget-monthly-crosstab-${report.reportYear}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatGeneratedAt(iso: string): string {
  return formatDisplayDateTime(iso);
}

export function SalesBudgetMonthlyCrosstabScreen({
  onNavigate,
}: SalesBudgetMonthlyCrosstabScreenProps) {
  const [report, setReport] = useState<SalesBudgetMonthlyCrosstabReport | null>(null);
  const [reportYear, setReportYear] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAuthenticatedReports()
      .getSalesBudgetMonthlyCrosstab(reportYear ?? undefined)
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

  if (loading && !report) {
    return <p class="scr-status">Loading sales budget monthly crosstab…</p>;
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data.</p>;
  }

  return (
    <div class="scr-page sbc-root" data-print-page="sales-budget-monthly-crosstab">
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
          <button type="button" class="scr-btn" onClick={() => downloadCsv(report)}>
            Export CSV
          </button>
          <ReportCommentsEditor
            reportId="sales-budget-monthly-crosstab"
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

      <div class="scr-document">
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department}
          serviceName={report.settings.serviceName}
          title="Sales budget — monthly phasing crosstab (kg)"
        />

        <div>
          <p class="sbc-intro">
            Calendar year <strong>{report.reportYear}</strong>. Rows are budget groups; columns are
            January–December. Each cell is phased budget kg for the fiscal period that contains
            that calendar month (from Sales budgets).{" "}
            {onNavigate ? (
              <button
                type="button"
                class="sbc-link-btn"
                onClick={() => onNavigate("sales-budget-weekly-crosstab")}
              >
                Weekly phasing crosstab
              </button>
            ) : (
              "See also the weekly phasing crosstab."
            )}
            .
          </p>
          <p class="sbc-intro-meta">Generated {formatGeneratedAt(report.generatedAtIso)}</p>
        </div>

        {!report.hasAnyBudget ? (
          <p class="sbc-empty">
            No product sales budgets are defined yet. Use Sales budgets to add annual quantities.
          </p>
        ) : report.categoriesInReportCount === 0 ? (
          <p class="sbc-empty">
            No category budgets for this year. Use Sales budgets to add annual quantities.
          </p>
        ) : (
          <div class="sbc-table-wrap">
            <table class="sbc-table">
              <thead>
                <tr>
                  <th class="sbc-sticky-col sbc-product-col">Budget group</th>
                  {CAL_MONTHS.map((month) => (
                    <th key={month} class="sbc-num" title={monthName(month)}>
                      {monthName(month).slice(0, 3)}
                    </th>
                  ))}
                  <th class="sbc-num sbc-total-col">Total</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.productCatId}>
                    <td class="sbc-sticky-col sbc-product-col">{row.label}</td>
                    {row.cells.map((kg, index) => (
                      <td
                        key={index}
                        class={`sbc-num${kg === 0 ? " sbc-zero" : ""}`}
                      >
                        {kg === 0 ? "—" : formatPhasedQtyKgDisplay(kg)}
                      </td>
                    ))}
                    <td class={`sbc-num sbc-total-col${row.rowTotal === 0 ? " sbc-zero" : ""}`}>
                      {row.rowTotal === 0 ? "—" : formatPhasedQtyKgDisplay(row.rowTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr class="sbc-foot">
                  <td class="sbc-sticky-col">Column totals (kg)</td>
                  {report.colTotals.map((value, index) => (
                    <td key={index} class={`sbc-num${value === 0 ? " sbc-zero" : ""}`}>
                      {value === 0 ? "—" : formatPhasedQtyKgDisplay(value)}
                    </td>
                  ))}
                  <td class={`sbc-num sbc-total-col${report.grandTotal === 0 ? " sbc-zero" : ""}`}>
                    {report.grandTotal === 0 ? "—" : formatPhasedQtyKgDisplay(report.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <ReportCommentsSection comments={report.comments} />
        <ReportFooter />
      </div>
    </div>
  );
}
