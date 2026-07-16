import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  StockCommitmentBottledSection,
  StockCommitmentReport,
  StockCommitmentReportRow,
} from "../../shared/reports.types.ts";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import "./StockCommitmentReport.css";

function formatReportDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-GB");
}

function formatShortReportDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

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
    `AS AT:,${formatReportDate(report.asAtIso)}`,
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

  if (report.bottledSection) {
    const bottled = report.bottledSection;
    lines.push(`${bottled.sectionNo}. ${bottled.title}`);
  lines.push(
      bottled.columns.map((column) => column.label).join(",") + ",TOTAL (KGS)",
    );
    lines.push(bottled.unitCounts.join(","));
    lines.push(["LITRES", ...bottled.litres, bottled.totalKgs].join(","));
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
      <table class="scr-table scr-bottled-table">
        <thead>
          <tr>
            <th colSpan={section.columns.length + 2} class="scr-section-title">
              {section.sectionNo}. {section.title}
            </th>
          </tr>
          <tr>
            <th />
            {section.columns.map((column) => (
              <th key={column.id}>{column.label}</th>
            ))}
            <th>TOTAL (KGS)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td />
            {section.unitCounts.map((count, index) => (
              <td key={`units-${index}`} class="scr-num">
                {formatUnits(count)}
              </td>
            ))}
            <td />
          </tr>
          <tr>
            <td class="scr-row-label">LITRES</td>
            {section.litres.map((litre, index) => (
              <td key={`litres-${index}`} class="scr-num">
                {formatUnits(litre)}
              </td>
            ))}
            <td />
          </tr>
          <tr>
            <td class="scr-row-label">KGS</td>
            {section.kgs.map((kg, index) => (
              <td key={`kgs-${index}`} class="scr-num">
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

export function StockCommitmentReportScreen() {
  const [report, setReport] = useState<StockCommitmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <button type="button" class="scr-btn scr-btn-secondary" onClick={() => downloadCsv(report)}>
          Export CSV
        </button>
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => {
            void getAuthenticatedReports().getStockCommitment().then(setReport);
          }}
        >
          Refresh
        </button>
      </div>

      <div class="scr-document">
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title="Stock vs commitments"
          meta={
            <>
              <p class="scr-meta-line">
                <span class="scr-meta-label">TO :</span> Commercial Director
              </p>
              <p class="scr-as-at">
                AS at{" "}
                <span class="scr-as-at-date">{formatShortReportDate(report.asAtIso)}</span>
              </p>
              <p class="scr-generated">{formatReportDate(report.asAtIso)}</p>
            </>
          }
        />

        <table class="scr-table">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>SALES POINT</th>
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
                  <td>{row.salesPointName ?? (row.kind === "data" ? "" : "")}</td>
                  <td class="scr-num">{formatKg(row.stockKg)}</td>
                  <td class="scr-num">{formatKg(row.commitmentKg)}</td>
                  <td class="scr-num">{formatKg(row.balanceKg)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>

        {report.bottledSection ? <BottledSection section={report.bottledSection} /> : null}
        <ReportFooter />
      </div>
    </div>
  );
}
