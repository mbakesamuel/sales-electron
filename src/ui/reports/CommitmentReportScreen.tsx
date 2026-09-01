import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { CommitmentReport, CommitmentReportSection } from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import { isCommitmentReportEmpty, HIDE_ZERO_ROWS_HINT } from "./reportEmpty.ts";
import "./StockCommitmentReport.css";


function formatQty(value: number | null | undefined): string {
  if (value == null) {
    return "";
  }
  if (value === 0) {
    return "0";
  }
  const rounded = Math.round(value);
  if (rounded < 0) {
    return `(${Math.abs(rounded).toLocaleString("en-US")})`;
  }
  return rounded.toLocaleString("en-US");
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

function buildCsv(report: CommitmentReport): string {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `AS AT:,${formatDisplayDate(report.asAtIso)}`,
    "",
  ].filter((line) => line.length > 0);

  for (const section of report.sections) {
    lines.push(`${section.sectionLetter}. ${section.title}`);
    lines.push(["CUSTOMER", ...section.salesPointNames, "TOTAL"].join(","));
    for (const row of section.rows) {
      lines.push([row.label, ...row.quantities, row.rowTotal].join(","));
    }
    lines.push("");
  }

  if (report.salesPointNames.length > 0) {
    lines.push("GRAND TOTAL");
    lines.push(["", ...report.salesPointNames, "TOTAL"].join(","));
    lines.push(
      ["GRAND TOTAL", ...report.columnTotals, report.grandTotal].join(","),
    );
  }

  return lines.join("\n");
}

function downloadCsv(report: CommitmentReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `commitment-report-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function CommitmentSection({ section }: { section: CommitmentReportSection }) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table scr-category-matrix">
        <thead>
          <tr>
            <th colSpan={section.salesPointNames.length + 2} class="scr-section-title">
              {section.sectionLetter}. {section.title}
            </th>
          </tr>
          <tr>
            <th>CUSTOMER</th>
            {section.salesPointNames.map((name) => (
              <th key={name}>{name}</th>
            ))}
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, index) => (
            <tr
              key={`${section.sectionLetter}-${index}`}
              class={row.kind === "total" ? "scr-row scr-row-total" : "scr-row"}
            >
              <td>{row.label}</td>
              {row.quantities.map((qty, qtyIndex) => (
                <td key={`${index}-${qtyIndex}`} class="scr-num">
                  {formatQty(qty)}
                </td>
              ))}
              <td class="scr-num">{formatQty(row.rowTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CommitmentReportDocument({ report }: { report: CommitmentReport }) {
  const empty = isCommitmentReportEmpty(report);

  return (
    <ReportDocumentShell
      className="scr-document sr-stock-compact cr-commitment-report wpp-pack-page"
      isEmpty={empty}
      emptyMessage="No commitment quantities to display."
      emptyHint={HIDE_ZERO_ROWS_HINT}
      comments={report.comments}
      signatoryName={report.settings.signatoryName}
      signatoryTitle={report.settings.signatoryTitle}
      header={
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title={`COMMITMENTS AS AT ${formatDisplayDate(report.asAtIso)}`}
        />
      }
    >
      {report.sections.map((section) => (
        <CommitmentSection key={section.sectionLetter} section={section} />
      ))}
      {report.salesPointNames.length > 0 ? (
        <div class="scr-bottled-block">
          <table class="scr-table scr-category-matrix">
            <thead>
              <tr />
              <tr />
            </thead>
            <tbody>
              <tr class="scr-row scr-row-total">
                <td>GRAND TOTAL</td>
                {report.columnTotals.map((qty, index) => (
                  <td key={`gt-${index}`} class="scr-num">
                    {formatQty(qty)}
                  </td>
                ))}
                <td class="scr-num">{formatQty(report.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </ReportDocumentShell>
  );
}

export function CommitmentReportScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] = useState<CommitmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getCommitmentReport();
        if (!cancelled) {
          setReport(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load report.");
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
    return <p class="scr-status">Loading commitment report...</p>;
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
          <ReportWindowSaveButton fileName={`commitment-report-${report.asAtIso}.pdf`} />
        ) : null}
        <button type="button" class="scr-btn scr-btn-secondary" onClick={() => downloadCsv(report)}>
          Export CSV
        </button>
        <ReportCommentsEditor
          reportId="commitment-report"
          comments={report.comments}
          onSaved={() => {
            void getAuthenticatedReports().getCommitmentReport().then(setReport);
          }}
        />
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => {
            void getAuthenticatedReports().getCommitmentReport().then(setReport);
          }}
        >
          Refresh
        </button>
      </div>

      <CommitmentReportDocument report={report} />
    </div>
  );
}
