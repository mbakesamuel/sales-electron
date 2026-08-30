import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  BottledWeeklyEstimateBasis,
  BottledWeeklyIssuesReport,
  BottledWeeklyMethodMetricRow,
} from "../../shared/reports.types.ts";
import { BOTTLED_WEEKLY_ESTIMATE_BASIS_OPTIONS } from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportEmptyMessage } from "./ReportEmptyMessage.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import {
  HIDE_ZERO_ROWS_HINT,
  isBottledWeeklyIssuesReportEmpty,
} from "./reportEmpty.ts";
import "./StockCommitmentReport.css";
import "./BottledWeeklyIssuesReport.css";
import "./SalesBudgetCrosstab.css";


const ESTIMATE_BASIS_STORAGE_KEY = "bwi-estimate-basis";

function readStoredEstimateBasis(): BottledWeeklyEstimateBasis {
  try {
    const value = localStorage.getItem(ESTIMATE_BASIS_STORAGE_KEY);
    return value === "iso-week" ? "iso-week" : "working-days";
  } catch {
    return "working-days";
  }
}

function writeStoredEstimateBasis(basis: BottledWeeklyEstimateBasis): void {
  try {
    localStorage.setItem(ESTIMATE_BASIS_STORAGE_KEY, basis);
  } catch {
    /* ignore quota / private mode */
  }
}

function formatQty(value: number | null | undefined): string {
  if (value == null) return "";
  if (value === 0) return "0";
  return Math.round(value).toLocaleString("en-US");
}

function formatFcfa(value: number | null | undefined): string {
  if (value == null) return "";
  if (value === 0) return "0";
  return Math.round(value).toLocaleString("en-US");
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatAvgPrice(value: number | null): string {
  if (value == null) return "";
  return Math.round(value).toLocaleString("en-US");
}

function handlePrint(): void {
  document.body.classList.add("scr-print-mode");
  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("scr-print-mode");
    },
    { once: true },
  );
  window.print();
}

function mtdDisplay(row: BottledWeeklyMethodMetricRow): string {
  return row.kind === "kgs"
    ? formatQty(row.monthToDateKg)
    : formatFcfa(row.monthToDateValue);
}

function weekValueDisplay(row: BottledWeeklyMethodMetricRow): string {
  return row.kind === "kgs" ? formatFcfa(row.weekValue) : formatFcfa(row.weekTotal);
}

function buildCsv(report: BottledWeeklyIssuesReport): string {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    report.settings.serviceName ? `Service:,${report.settings.serviceName}` : "",
    `Title:,${report.reportTitle}`,
    `Week:,${report.weekFromIso} to ${report.weekToIso}`,
    `Week ESTM basis:,${report.estimateBasisLabel} (${report.estimateWeekDaysInMonth} day(s) in month)`,
    "",
    "DETAIL",
    [
      "MONTH",
      "METHOD",
      "METRIC",
      ...report.detail.dayColumns.map((column) => column.label),
      "TOTAL",
      "VALUE FCFA",
      "MONTH TO DATE",
    ].join(","),
  ];

  for (const method of report.detail.methods) {
    for (const row of method.rows) {
      lines.push(
        [
          report.detail.monthLabel,
          method.label,
          row.label,
          ...row.dayValues.map((value) =>
            row.kind === "kgs" ? formatQty(value) : formatFcfa(value),
          ),
          row.kind === "kgs" ? formatQty(row.weekTotal) : formatFcfa(row.weekTotal),
          weekValueDisplay(row),
          mtdDisplay(row),
        ].join(","),
      );
    }
  }

  lines.push("", "SUMMARY");
  lines.push(
    "ROW,WEEK KGS,WEEK FCFA,MTD KGS,MTD FCFA,YTD KGS,YTD FCFA,AVG PRICE",
  );
  for (const row of report.summary.rows) {
    lines.push(
      [
        row.label,
        row.id === "pct" ? formatPercent(row.week.kgs) : formatQty(row.week.kgs),
        row.id === "pct" ? formatPercent(row.week.value) : formatFcfa(row.week.value),
        row.id === "pct"
          ? formatPercent(row.monthToDate.kgs)
          : formatQty(row.monthToDate.kgs),
        row.id === "pct"
          ? formatPercent(row.monthToDate.value)
          : formatFcfa(row.monthToDate.value),
        row.id === "pct" ? formatPercent(row.yearToDate.kgs) : formatQty(row.yearToDate.kgs),
        row.id === "pct"
          ? formatPercent(row.yearToDate.value)
          : formatFcfa(row.yearToDate.value),
        formatAvgPrice(row.averagePrice),
      ].join(","),
    );
  }

  lines.push("", "COMPARE");
  lines.push(
    `METHOD,${report.compare.currentColumn.label},%,${report.compare.priorColumn.label},%`,
  );
  for (const row of report.compare.rows) {
    lines.push(
      [
        row.label,
        formatQty(row.currentKg),
        formatPercent(row.currentPct),
        formatQty(row.priorKg),
        formatPercent(row.priorPct),
      ].join(","),
    );
  }

  return lines.filter((line) => line !== "").join("\n");
}

function downloadCsv(report: BottledWeeklyIssuesReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bottled-weekly-issues-${report.asAtIso}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function BottledWeeklyIssuesReportDocument({
  report,
}: {
  report: BottledWeeklyIssuesReport;
}) {
  const dayColSpan = report.detail.dayColumns.length;
  const empty = isBottledWeeklyIssuesReportEmpty(report);

  return (
    <ReportDocumentShell
      className="scr-document bwi-document wpp-pack-page"
      isEmpty={empty}
      emptyMessage="No bottled weekly issues for this period."
      emptyHint={HIDE_ZERO_ROWS_HINT}
      comments={report.comments}
      signatoryName={report.settings.signatoryName}
      signatoryTitle={report.settings.signatoryTitle}
      header={
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title={report.reportTitle}
        />
      }
    >
      <div class="scr-bottled-block">
        <table class="scr-table bwi-detail-table">
          <thead>
            <tr>
              <th>MONTH</th>
              <th>METHOD PAYMT</th>
              <th>METRIC</th>
              {report.detail.dayColumns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
              <th>TOTAL</th>
              <th>VALUE FCFA</th>
              <th>MONTH TO DATE</th>
            </tr>
          </thead>
          <tbody>
            {report.detail.methods.map((method, methodIndex) =>
              method.rows.map((row, rowIndex) => (
                <tr key={`${method.method}-${row.kind}`} class="scr-row">
                  {methodIndex === 0 && rowIndex === 0 ? (
                    <td
                      class="scr-row-label"
                      rowSpan={report.detail.methods.length * 2 + 2}
                    >
                      {report.detail.monthLabel}
                    </td>
                  ) : null}
                  {rowIndex === 0 ? (
                    <td class="scr-row-label" rowSpan={2}>
                      {method.label}
                    </td>
                  ) : null}
                  <td class="scr-row-label">{row.label}</td>
                  {row.dayValues.map((value, index) => (
                    <td key={`${method.method}-${row.kind}-${index}`} class="scr-num">
                      {row.kind === "kgs" ? formatQty(value) : formatFcfa(value)}
                    </td>
                  ))}
                  <td class="scr-num scr-total-cell">
                    {row.kind === "kgs"
                      ? formatQty(row.weekTotal)
                      : formatFcfa(row.weekTotal)}
                  </td>
                  <td class="scr-num">{weekValueDisplay(row)}</td>
                  <td class="scr-num">{mtdDisplay(row)}</td>
                </tr>
              )),
            )}
            {report.detail.totals.map((row, rowIndex) => (
              <tr key={`total-${row.kind}`} class="scr-row scr-row-total">
                {rowIndex === 0 ? (
                  <td class="scr-row-label" rowSpan={2}>
                    TOTAL
                  </td>
                ) : null}
                <td class="scr-row-label">{row.label}</td>
                {row.dayValues.map((value, index) => (
                  <td key={`total-${row.kind}-${index}`} class="scr-num">
                    {row.kind === "kgs" ? formatQty(value) : formatFcfa(value)}
                  </td>
                ))}
                <td class="scr-num scr-total-cell">
                  {row.kind === "kgs"
                    ? formatQty(row.weekTotal)
                    : formatFcfa(row.weekTotal)}
                </td>
                <td class="scr-num">{weekValueDisplay(row)}</td>
                <td class="scr-num">{mtdDisplay(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="scr-bottled-block">
        <table class="scr-table bwi-summary-table">
          <thead>
            <tr>
              <th rowSpan={2}>{report.summary.title}</th>
              <th colSpan={2}>
                WEEK
                <div class="bwi-estimate-basis-note">
                  ESTM: {report.estimateBasisLabel}
                </div>
              </th>
              <th colSpan={2}>MONTH TO DATE</th>
              <th colSpan={2}>YEAR TO DATE</th>
              <th rowSpan={2}>AVERAGE PRICE FCFA/KG</th>
            </tr>
            <tr>
              <th>KGS</th>
              <th>FCFA</th>
              <th>KGS</th>
              <th>FCFA</th>
              <th>KGS</th>
              <th>FCFA</th>
            </tr>
          </thead>
          <tbody>
            {report.summary.rows.map((row) => (
              <tr
                key={row.id}
                class={row.id === "actual" ? "scr-row scr-row-total" : "scr-row"}
              >
                <td class="scr-row-label">{row.label}</td>
                <td class="scr-num">
                  {row.id === "pct"
                    ? formatPercent(row.week.kgs)
                    : formatQty(row.week.kgs)}
                </td>
                <td class="scr-num">
                  {row.id === "pct"
                    ? formatPercent(row.week.value)
                    : formatFcfa(row.week.value)}
                </td>
                <td class="scr-num">
                  {row.id === "pct"
                    ? formatPercent(row.monthToDate.kgs)
                    : formatQty(row.monthToDate.kgs)}
                </td>
                <td class="scr-num">
                  {row.id === "pct"
                    ? formatPercent(row.monthToDate.value)
                    : formatFcfa(row.monthToDate.value)}
                </td>
                <td class="scr-num">
                  {row.id === "pct"
                    ? formatPercent(row.yearToDate.kgs)
                    : formatQty(row.yearToDate.kgs)}
                </td>
                <td class="scr-num">
                  {row.id === "pct"
                    ? formatPercent(row.yearToDate.value)
                    : formatFcfa(row.yearToDate.value)}
                </td>
                <td class="scr-num">{formatAvgPrice(row.averagePrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="scr-bottled-block">
        <table class="scr-table bwi-compare-table">
          <thead>
            <tr>
              <th>METHOD</th>
              <th>{report.compare.currentColumn.label}</th>
              <th>%</th>
              <th>{report.compare.priorColumn.label}</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {report.compare.rows.map((row) => (
              <tr
                key={row.method}
                class={row.method === "TOTAL" ? "scr-row scr-row-total" : "scr-row"}
              >
                <td class="scr-row-label">{row.label}</td>
                <td class="scr-num">{formatQty(row.currentKg)}</td>
                <td class="scr-num">{formatPercent(row.currentPct)}</td>
                <td class="scr-num">{formatQty(row.priorKg)}</td>
                <td class="scr-num">{formatPercent(row.priorPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dayColSpan === 0 ? (
        <ReportEmptyMessage message="No weekday columns in the current week window." />
      ) : null}
    </ReportDocumentShell>
  );
}

export function BottledWeeklyIssuesReportScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [estimateBasis, setEstimateBasis] = useState<BottledWeeklyEstimateBasis>(
    readStoredEstimateBasis,
  );
  const [weekMondayIso, setWeekMondayIso] = useState<string | undefined>(undefined);
  const [report, setReport] = useState<BottledWeeklyIssuesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getBottledWeeklyIssues(
          estimateBasis,
          weekMondayIso,
        );
        if (!cancelled) setReport(data);
      } catch (loadError) {
        if (!cancelled) {
          setReport(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load bottled weekly issues report.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [estimateBasis, weekMondayIso]);

  function onEstimateBasisChange(next: BottledWeeklyEstimateBasis) {
    writeStoredEstimateBasis(next);
    setEstimateBasis(next);
  }

  function reload() {
    const monday = weekMondayIso ?? report?.weekMondayIso;
    void getAuthenticatedReports()
      .getBottledWeeklyIssues(estimateBasis, monday)
      .then(setReport)
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load bottled weekly issues report.",
        );
      });
  }

  if (loading && !report) {
    return <p class="scr-status">Loading bottled weekly issues...</p>;
  }
  if (error && !report) return <p class="scr-status scr-status-error">{error}</p>;
  if (!report) return <p class="scr-status">No report data available.</p>;

  const basisHint =
    BOTTLED_WEEKLY_ESTIMATE_BASIS_OPTIONS.find((option) => option.id === estimateBasis)
      ?.hint ?? "";

  return (
    <div class="scr-page sbc-root">
      <div class="scr-toolbar no-print sbc-toolbar">
        {report.weekChoices.length > 0 ? (
          <div class="sbc-year-picker" aria-label="Week in open month">
            {report.weekChoices.map((week) => (
              <button
                key={week.weekMondayIso}
                type="button"
                class={`sbc-year-btn${week.weekMondayIso === report.weekMondayIso ? " is-active" : ""}`}
                disabled={loading}
                onClick={() => setWeekMondayIso(week.weekMondayIso)}
              >
                {week.label}
              </button>
            ))}
          </div>
        ) : null}
        <label class="bwi-estimate-basis">
          <span>Week ESTM</span>
          <select
            value={estimateBasis}
            disabled={loading}
            title={basisHint}
            onChange={(event) => {
              const value = (event.currentTarget as HTMLSelectElement).value;
              onEstimateBasisChange(value === "iso-week" ? "iso-week" : "working-days");
            }}
          >
            {BOTTLED_WEEKLY_ESTIMATE_BASIS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} title={option.hint}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div class="scr-toolbar-actions sbc-actions">
          <button type="button" class="scr-btn" onClick={handlePrint}>
            Print
          </button>
          {windowMode ? (
            <ReportWindowSaveButton
              fileName={`bottled-weekly-issues-${report.weekToIso ?? report.asAtIso}.pdf`}
            />
          ) : null}
          <button
            type="button"
            class="scr-btn scr-btn-secondary"
            onClick={() => downloadCsv(report)}
          >
            Export CSV
          </button>
          <ReportCommentsEditor
            reportId="bottled-weekly-issues-report"
            comments={report.comments}
            onSaved={reload}
          />
          <button
            type="button"
            class="scr-btn scr-btn-secondary"
            disabled={loading}
            onClick={reload}
          >
            Refresh
          </button>
        </div>
      </div>
      {error ? <p class="scr-status scr-status-error no-print">{error}</p> : null}
      <p class="bwi-estimate-hint no-print">
        {basisHint}
        {report.estimateWeekDaysInMonth > 0
          ? ` · ${report.estimateWeekDaysInMonth} day(s) of the open month in this week window.`
          : null}
      </p>

      <BottledWeeklyIssuesReportDocument report={report} />
    </div>
  );
}
