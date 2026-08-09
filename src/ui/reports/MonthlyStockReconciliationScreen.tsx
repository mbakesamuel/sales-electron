import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  MonthlyStockReconciliationMatrixRow,
  MonthlyStockReconciliationReport,
} from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import "./StockCommitmentReport.css";
import "./MonthlyStockReconciliationReport.css";

function formatKg(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }
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

function rowClassName(row: MonthlyStockReconciliationMatrixRow): string {
  if (row.kind === "total" || row.kind === "subtotal") {
    return "scr-row scr-row-total";
  }
  if (row.kind === "section_header") {
    return "scr-row msr-section-header-row";
  }
  if (row.kind === "blank") {
    return "scr-row msr-blank-row";
  }
  return "scr-row";
}

function DataRow({
  report,
  row,
}: {
  report: MonthlyStockReconciliationReport;
  row: MonthlyStockReconciliationMatrixRow;
}) {
  return (
    <tr class={rowClassName(row)}>
      <td>{row.label}</td>
      {report.salesPointIds.map((salesPointId) => (
        <td key={salesPointId} class="scr-num">
          {formatKg(row.valuesBySalesPointId[String(salesPointId)])}
        </td>
      ))}
      <td class="scr-num scr-total-cell">{formatKg(row.total)}</td>
    </tr>
  );
}

function SectionTitleRow({
  title,
  colCount,
}: {
  title: string;
  colCount: number;
}) {
  return (
    <tr class="msr-section-title-row">
      <td colSpan={colCount} class="scr-section-title">
        {title}
      </td>
    </tr>
  );
}

function ReportMatrix({ report }: { report: MonthlyStockReconciliationReport }) {
  const colCount = report.salesPointNames.length + 2;

  return (
    <div class="scr-bottled-block mdr-section">
      <table class="scr-table sr-report-matrix msr-table">
        <thead>
          <tr>
            <th />
            {report.salesPointNames.map((name) => (
              <th key={name}>{name}</th>
            ))}
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <DataRow report={report} row={report.openingRow} />

          <SectionTitleRow title={report.receptionSectionTitle} colCount={colCount} />
          {report.receptionRows.map((row, index) => (
            <DataRow key={`reception-${index}`} report={report} row={row} />
          ))}
          <DataRow report={report} row={report.totalReceptionRow} />
          <DataRow report={report} row={report.openingPlusReceptionRow} />

          <SectionTitleRow title={report.issuesSectionTitle} colCount={colCount} />
          {report.issueRows.map((row, index) => (
            <DataRow key={`issue-${index}`} report={report} row={row} />
          ))}
          <DataRow report={report} row={report.totalIssuesRow} />
          <DataRow report={report} row={report.calculatedStockRow} />
          <DataRow report={report} row={report.physicalStockRow} />
          <DataRow report={report} row={report.varianceRow} />

          <SectionTitleRow title={report.bpoSectionTitle} colCount={colCount} />
          {report.bpoRows.map((row, index) => (
            <DataRow key={`bpo-${index}`} report={report} row={row} />
          ))}

          <SectionTitleRow title={report.otherSectionTitle} colCount={colCount} />
          {report.otherRows.map((row, index) => (
            <DataRow key={`other-${index}`} report={report} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildCsv(report: MonthlyStockReconciliationReport): string {
  const header = ["", ...report.salesPointNames, "TOTAL"].join(",");

  function pushRow(lines: string[], row: MonthlyStockReconciliationMatrixRow): void {
    const cells = report.salesPointIds.map((id) => {
      const value = row.valuesBySalesPointId[String(id)];
      return value == null ? "" : String(value);
    });
    lines.push(
      [row.label, ...cells, row.total == null ? "" : String(row.total)].join(","),
    );
  }

  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
  ];
  if (report.settings.department) {
    lines.push(`Department:,${report.settings.department}`);
  }
  lines.push(`Title:,${report.reportTitle}`, "", header);

  pushRow(lines, report.openingRow);
  lines.push(report.receptionSectionTitle);
  for (const row of report.receptionRows) {
    pushRow(lines, row);
  }
  pushRow(lines, report.totalReceptionRow);
  pushRow(lines, report.openingPlusReceptionRow);

  lines.push(report.issuesSectionTitle);
  for (const row of report.issueRows) {
    pushRow(lines, row);
  }
  pushRow(lines, report.totalIssuesRow);
  pushRow(lines, report.calculatedStockRow);
  pushRow(lines, report.physicalStockRow);
  pushRow(lines, report.varianceRow);

  lines.push(report.bpoSectionTitle);
  for (const row of report.bpoRows) {
    pushRow(lines, row);
  }

  lines.push(report.otherSectionTitle);
  for (const row of report.otherRows) {
    pushRow(lines, row);
  }

  return lines.join("\n");
}

function downloadCsv(report: MonthlyStockReconciliationReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `monthly-stock-reconciliation-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MonthlyStockReconciliationDocument({
  report,
}: {
  report: MonthlyStockReconciliationReport;
}) {
  return (
    <div class="scr-document msr-document wpp-pack-page">
      <ReportHeader
        companyName={report.settings.companyName}
        department={report.settings.department ?? null}
        serviceName={report.settings.serviceName ?? null}
        title={report.reportTitle}
      />

      <ReportMatrix report={report} />

      <ReportCommentsSection comments={report.comments} />
      <ReportFooter name={report.settings.signatoryName} label={report.settings.signatoryTitle} />
    </div>
  );
}

export function MonthlyStockReconciliationScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] = useState<MonthlyStockReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getMonthlyStockReconciliation();
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
    return <p class="scr-status">Loading monthly stock reconciliation...</p>;
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
            fileName={`monthly-stock-reconciliation-${report.asAtIso}.pdf`}
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
          reportId="monthly-stock-reconciliation-report"
          comments={report.comments}
          onSaved={() => {
            void getAuthenticatedReports()
              .getMonthlyStockReconciliation()
              .then(setReport);
          }}
        />
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => {
            void getAuthenticatedReports()
              .getMonthlyStockReconciliation()
              .then(setReport);
          }}
        >
          Refresh
        </button>
      </div>

      <MonthlyStockReconciliationDocument report={report} />
    </div>
  );
}
