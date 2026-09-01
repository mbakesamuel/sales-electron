import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type {
  StockCommitmentBottledSection,
  StockCommitmentReport,
  StockCommitmentReportRow,
} from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import {
  HIDE_ZERO_ROWS_HINT,
  isStockCommitmentReportEmpty,
} from "./reportEmpty.ts";
import "./StockCommitmentReport.css";


function formatKg(value: number | null | undefined): string {
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

function formatUnits(value: number | null | undefined): string {
  if (value == null || value === 0) {
    return "0";
  }
  return Math.round(value).toLocaleString("en-US");
}

function isJugPackLabel(label: string): boolean {
  const text = label.toUpperCase();
  return text.includes("20L") || text.includes("JUG");
}

function bottledPackColClass(label: string): string {
  const classes = ["scr-bottled-pack-col", "sr-bottled-product-col"];
  if (isJugPackLabel(label)) {
    classes.push("scr-bottled-pack-col--jug");
  }
  return classes.join(" ");
}

function rowClassName(row: StockCommitmentReportRow): string {
  if (row.kind === "header") {
    return "scr-row scr-row-header";
  }
  if (row.kind === "subtotal" || row.kind === "total" || row.kind === "grand_total") {
    return "scr-row scr-row-total";
  }
  return row.indent ? "scr-row scr-row-indent" : "scr-row";
}

function buildCsv(report: StockCommitmentReport): string {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `AS AT:,${formatDisplayDate(report.asAtIso)}`,
    "",
    "PRODUCT,SALES POINT,STOCK (KG),COMMITMENTS (KG),BALANCE (KG)",
  ].filter((line) => line.length > 0);

  for (const section of report.sections) {
    for (const row of section.rows) {
      if (row.kind === "header") {
        lines.push(`${row.label},,,,`);
        continue;
      }
      lines.push(
        [
          row.label,
          row.salesPointName ?? "",
          row.stockKg ?? "",
          row.commitmentKg ?? "",
          row.balanceKg ?? "",
        ].join(","),
      );
    }
    lines.push("");
  }

  if (report.looseGrandTotal) {
    const row = report.looseGrandTotal;
    lines.push(
      [
        row.label,
        row.salesPointName ?? "",
        row.stockKg ?? "",
        row.commitmentKg ?? "",
        row.balanceKg ?? "",
      ].join(","),
    );
    lines.push("");
  }

  if (report.bottledSection) {
    const bottled = report.bottledSection;
    lines.push(`${bottled.sectionNo}. ${bottled.title}`);
    lines.push(
      ["", ...bottled.columns.map((column) => column.label), "TOTAL"].join(","),
    );
    lines.push(["UNITS", ...bottled.unitCounts, bottled.totalUnits].join(","));
    lines.push(["LITRES", ...bottled.litres, bottled.totalLitres].join(","));
    lines.push(["KGS", ...bottled.kgs, bottled.totalKgs].join(","));
  }

  return lines.join("\n");
}

function downloadCsv(report: StockCommitmentReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `stock-commitment-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
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

function BottledSection({ section }: { section: StockCommitmentBottledSection }) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table scr-bottled-table sr-report-matrix sr-bottled-products">
        <colgroup>
          <col class="sr-col-label" />
          {section.columns.map((column) => (
            <col key={column.id} class={bottledPackColClass(column.label)} />
          ))}
          <col class="sr-col-last" />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={section.columns.length + 2} class="scr-section-title">
              {section.sectionNo}. {section.title}
            </th>
          </tr>
          <tr>
            <th />
            {section.columns.map((column) => (
              <th
                key={column.id}
                class={`sr-bottled-product-head ${bottledPackColClass(column.label)}`}
                title={column.label}
              >
                {column.label}
              </th>
            ))}
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="scr-row-label">UNITS</td>
            {section.unitCounts.map((count, index) => (
              <td
                key={`units-${index}`}
                class={`scr-num ${bottledPackColClass(section.columns[index]?.label ?? "")}`}
              >
                {formatUnits(count)}
              </td>
            ))}
            <td class="scr-num scr-total-cell">{formatUnits(section.totalUnits)}</td>
          </tr>
          <tr>
            <td class="scr-row-label">LITRES</td>
            {section.litres.map((litre, index) => (
              <td
                key={`litres-${index}`}
                class={`scr-num ${bottledPackColClass(section.columns[index]?.label ?? "")}`}
              >
                {formatUnits(litre)}
              </td>
            ))}
            <td class="scr-num scr-total-cell">{formatUnits(section.totalLitres)}</td>
          </tr>
          <tr>
            <td class="scr-row-label">KGS</td>
            {section.kgs.map((kg, index) => (
              <td
                key={`kgs-${index}`}
                class={`scr-num ${bottledPackColClass(section.columns[index]?.label ?? "")}`}
              >
                {formatKg(kg)}
              </td>
            ))}
            <td class="scr-num scr-total-cell">{formatKg(section.totalKgs)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function StockCommitmentReportDocument({
  report,
}: {
  report: StockCommitmentReport;
}) {
  const empty = isStockCommitmentReportEmpty(report);

  return (
    <ReportDocumentShell
      className="scr-document sr-stock-compact wpp-pack-page"
      isEmpty={empty}
      emptyMessage="No stock or commitment quantities to display."
      emptyHint={HIDE_ZERO_ROWS_HINT}
      comments={report.comments}
      signatoryName={report.settings.signatoryName}
      signatoryTitle={report.settings.signatoryTitle}
      header={
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title={`STOCK VS COMMITMENTS AS AT ${formatDisplayDate(report.asAtIso)}`}
        />
      }
    >
      <table class="scr-table scr-stock-main-table">
        <thead>
          <tr>
            <th>PRODUCT</th>
            <th class="scr-col-sales-point">SALES POINT</th>
            <th>STOCK (KG)</th>
            <th>COMMITMENTS (KG)</th>
            <th>BALANCE (KG)</th>
          </tr>
        </thead>
        <tbody>
          {report.sections.map((section) =>
            section.rows.map((row, index) => (
              <tr key={`${section.sectionNo}-${index}`} class={rowClassName(row)}>
                <td>{row.kind === "header" ? row.label : row.label}</td>
                <td class="scr-col-sales-point">
                  {row.salesPointName ?? (row.kind === "data" ? "" : "")}
                </td>
                <td class="scr-num">{formatKg(row.stockKg)}</td>
                <td class="scr-num">{formatKg(row.commitmentKg)}</td>
                <td class="scr-num">{formatKg(row.balanceKg)}</td>
              </tr>
            )),
          )}
          {report.looseGrandTotal ? (
            <tr class={rowClassName(report.looseGrandTotal)}>
              <td>{report.looseGrandTotal.label}</td>
              <td class="scr-col-sales-point">
                {report.looseGrandTotal.salesPointName ?? ""}
              </td>
              <td class="scr-num">{formatKg(report.looseGrandTotal.stockKg)}</td>
              <td class="scr-num">{formatKg(report.looseGrandTotal.commitmentKg)}</td>
              <td class="scr-num">{formatKg(report.looseGrandTotal.balanceKg)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {report.bottledSection ? (
        <BottledSection section={report.bottledSection} />
      ) : null}
    </ReportDocumentShell>
  );
}

export function StockCommitmentReportScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] = useState<StockCommitmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reloadReport() {
    const data = await getAuthenticatedReports().getStockCommitment();
    setReport(data);
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getStockCommitment();
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
    return <p class="scr-status">Loading stock &amp; commitment report...</p>;
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
          <ReportWindowSaveButton fileName={`stock-commitment-${report.asAtIso}.pdf`} />
        ) : null}
        <button type="button" class="scr-btn scr-btn-secondary" onClick={() => downloadCsv(report)}>
          Export CSV
        </button>
        <ReportCommentsEditor
          reportId="stock-commitment-report"
          comments={report.comments}
          onSaved={() => void reloadReport()}
        />
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => {
            void reloadReport().catch((refreshError) => {
              setError(
                refreshError instanceof Error
                  ? refreshError.message
                  : "Failed to refresh report.",
              );
            });
          }}
        >
          Refresh
        </button>
      </div>

      <StockCommitmentReportDocument report={report} />
    </div>
  );
}
