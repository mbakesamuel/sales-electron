import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type { MonthlyDeliveriesByDestinationReport } from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import "./StockCommitmentReport.css";
import "./MonthlyDeliveriesByDestinationReport.css";

function formatKg(value: number): string {
  if (Math.abs(value) < 0.0005) {
    return "—";
  }
  return Math.round(value).toLocaleString("en-US");
}

function formatPct(value: number | null): string {
  if (value == null || Math.abs(value) < 0.0005) {
    return "—";
  }
  return `${value.toFixed(2)}%`;
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

function downloadCsv(report: MonthlyDeliveriesByDestinationReport): void {
  const lines = [
    [
      "WEEKS",
      "DATES",
      "INDUSTRIES",
      "WHOLESALES",
      "RETAIL",
      "CDC_WORKERS",
      "MAKOKO_FARMS",
      "TOTAL",
    ],
    ...report.weeks.map((week) => [
      String(week.weekIndex),
      week.datesLabel,
      String(Math.round(week.industriesKg)),
      String(Math.round(week.wholesalesKg)),
      String(Math.round(week.retailKg)),
      String(Math.round(week.cdcWorkersKg)),
      String(Math.round(week.makokoKg)),
      String(Math.round(week.totalKg)),
    ]),
    [
      "",
      "TOTAL",
      String(Math.round(report.totals.industriesKg)),
      String(Math.round(report.totals.wholesalesKg)),
      String(Math.round(report.totals.retailKg)),
      String(Math.round(report.totals.cdcWorkersKg)),
      String(Math.round(report.totals.makokoKg)),
      String(Math.round(report.totals.totalKg)),
    ],
    [
      "",
      "TOTAL %",
      report.percentages.industriesPct == null
        ? ""
        : report.percentages.industriesPct.toFixed(2),
      report.percentages.wholesalesPct == null
        ? ""
        : report.percentages.wholesalesPct.toFixed(2),
      report.percentages.retailPct == null ? "" : report.percentages.retailPct.toFixed(2),
      report.percentages.cdcWorkersPct == null
        ? ""
        : report.percentages.cdcWorkersPct.toFixed(2),
      report.percentages.makokoPct == null ? "" : report.percentages.makokoPct.toFixed(2),
      report.percentages.totalPct == null ? "" : report.percentages.totalPct.toFixed(2),
    ],
  ];
  const csv = lines.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `monthly-deliveries-by-destination-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function KgCells({
  industriesKg,
  wholesalesKg,
  retailKg,
  cdcWorkersKg,
  makokoKg,
  totalKg,
}: {
  industriesKg: number;
  wholesalesKg: number;
  retailKg: number;
  cdcWorkersKg: number;
  makokoKg: number;
  totalKg: number;
}) {
  return (
    <>
      <td class="scr-num">{formatKg(industriesKg)}</td>
      <td class="scr-num">{formatKg(wholesalesKg)}</td>
      <td class="scr-num">{formatKg(retailKg)}</td>
      <td class="scr-num">{formatKg(cdcWorkersKg)}</td>
      <td class="scr-num">{formatKg(makokoKg)}</td>
      <td class="scr-num">{formatKg(totalKg)}</td>
    </>
  );
}

function ReportTable({ report }: { report: MonthlyDeliveriesByDestinationReport }) {
  return (
    <div class="scr-bottled-block mdd-section">
      <table class="scr-table mdd-table">
        <thead>
          <tr>
            <th class="mdd-weeks-col">WEEKS</th>
            <th class="mdd-dates-col">DATES</th>
            <th>INDUSTRIES</th>
            <th>WHOLESALES</th>
            <th>RETAIL</th>
            <th>CDC WORKERS</th>
            <th>MAKOKO FARMS</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {report.weeks.map((week) => (
            <tr key={week.weekIndex} class="scr-row">
              <td class="mdd-center">{week.weekIndex}</td>
              <td class="mdd-center">{week.datesLabel}</td>
              <KgCells {...week} />
            </tr>
          ))}
          <tr class="scr-row scr-row-total">
            <td />
            <td class="mdd-center">TOTAL</td>
            <KgCells {...report.totals} />
          </tr>
          <tr class="scr-row mdd-pct-row">
            <td />
            <td class="mdd-center">TOTAL %</td>
            <td class="scr-num">{formatPct(report.percentages.industriesPct)}</td>
            <td class="scr-num">{formatPct(report.percentages.wholesalesPct)}</td>
            <td class="scr-num">{formatPct(report.percentages.retailPct)}</td>
            <td class="scr-num">{formatPct(report.percentages.cdcWorkersPct)}</td>
            <td class="scr-num">{formatPct(report.percentages.makokoPct)}</td>
            <td class="scr-num">{formatPct(report.percentages.totalPct)}</td>
          </tr>
        </tbody>
      </table>
      <p class="mdd-legend no-print">
        Validated non-bottled sales (kg) by customer type for the open month. CDC Workers includes
        ration disposition and unmatched types.
      </p>
    </div>
  );
}

function ReportDocument({ report }: { report: MonthlyDeliveriesByDestinationReport }) {
  return (
    <div class="scr-document mdd-document">
      <ReportHeader
        companyName={report.settings.companyName}
        department={report.settings.department ?? null}
        serviceName={report.settings.serviceName ?? null}
        title={report.reportTitle}
      />
      <ReportTable report={report} />
      <ReportCommentsSection comments={report.comments} />
      <ReportFooter name={report.settings.signatoryName} label={report.settings.signatoryTitle} />
    </div>
  );
}

export function MonthlyDeliveriesByDestinationScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] = useState<MonthlyDeliveriesByDestinationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getMonthlyDeliveriesByDestination();
        if (!cancelled) {
          setReport(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load report.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p class="scr-status">Loading deliveries by destination report…</p>;
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  return (
    <div class="scr-page">
      <div class="scr-toolbar no-print">
        <button type="button" class="scr-btn" onClick={handlePrint}>
          Print
        </button>
        {windowMode ? (
          <ReportWindowSaveButton
            fileName={`monthly-deliveries-by-destination-${report.asAtIso}.pdf`}
          />
        ) : null}
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => downloadCsv(report)}
        >
          CSV
        </button>
        <ReportCommentsEditor
          reportId="monthly-deliveries-by-destination-report"
          initialText={report.comments}
          onSaved={(comments) => setReport({ ...report, comments })}
        />
      </div>
      <ReportDocument report={report} />
    </div>
  );
}
