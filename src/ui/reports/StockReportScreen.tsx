import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  StockReport,
  StockReportBottledSection,
  StockReportLooseRow,
  StockReportProductMatrix,
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

function looseRowClassName(row: StockReportLooseRow): string {
  if (row.kind === "subtotal" || row.kind === "grand_total") {
    return "scr-row scr-row-total";
  }
  return "scr-row";
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

function buildCsv(report: StockReport): string {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department
      ? `Department:,${report.settings.department}`
      : "",
    `AS AT:,${formatReportDate(report.asAtIso)}`,
    "",
    "SALES POINT,STORAGE,QUANTITY (KG),REMARKS",
  ].filter((line) => line.length > 0);

  for (const row of report.looseRows) {
    lines.push(
      [
        row.salesPointName ?? "",
        row.storageName ?? "",
        row.quantityKg ?? "",
        row.remarks ?? "",
      ].join(","),
    );
  }

  if (report.bottledSection) {
    const bottled = report.bottledSection;
    lines.push("", bottled.title);
    lines.push(
      ["", ...bottled.columns.map((column) => column.label), "TOTAL"].join(","),
    );
    for (const row of bottled.rows) {
      lines.push(
        ["", ...row.unitCounts, sumRowUnits(row.unitCounts)].join(","),
      );
    }
    lines.push(["TOTAL", ...bottled.columnTotals, ""].join(","));
    lines.push(["LITRES", ...bottled.litres, ""].join(","));
    lines.push(["KGS", ...bottled.kgs, bottled.totalKgs].join(","));
  }

  if (report.otherProductsSection) {
    const section = report.otherProductsSection;
    lines.push("", section.title);
    lines.push(["", ...section.salesPointNames, "TOTAL"].join(","));
    for (const row of section.rows) {
      lines.push(
        [row.productName, ...row.quantities, sumRowUnits(row.quantities)].join(
          ",",
        ),
      );
    }
    lines.push(
      ["TOTAL", ...section.totals, sumRowUnits(section.totals)].join(","),
    );
  }

  return lines.join("\n");
}

function sumRowUnits(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function ReportMatrixColGroup({ middleCount }: { middleCount: number }) {
  return (
    <colgroup>
      <col class="sr-col-label" />
      {Array.from({ length: middleCount }, (_, index) => (
        <col key={index} class="sr-col-mid" />
      ))}
      <col class="sr-col-last" />
    </colgroup>
  );
}

function downloadCsv(report: StockReport): void {
  const blob = new Blob([buildCsv(report)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `stock-report-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* bottled section */
function BottledMatrixSection({
  section,
}: {
  section: StockReportBottledSection;
}) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table scr-bottled-table sr-report-matrix">
        <ReportMatrixColGroup middleCount={section.columns.length} />
        <thead>
          <tr>
            <th colSpan={section.columns.length + 2} class="scr-section-title">
              {section.title}
            </th>
          </tr>
          <tr>
            <th />
            {section.columns.map((column) => (
              <th key={column.id}>{column.label}</th>
            ))}
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.salesPointName}>
              <td class="scr-row-label">{row.salesPointName}</td>
              {row.unitCounts.map((count, index) => (
                <td key={`${row.salesPointName}-${index}`} class="scr-num">
                  {formatUnits(count)}
                </td>
              ))}
              <td class="scr-num">
                {formatUnits(sumRowUnits(row.unitCounts))}
              </td>
            </tr>
          ))}
          <tr class="scr-row-total">
            <td class="scr-row-label">TOTAL</td>
            {section.columnTotals.map((count, index) => (
              <td key={`total-${index}`} class="scr-num">
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

/* other products section */
function OtherProductsSection({
  section,
}: {
  section: StockReportProductMatrix;
}) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table sr-report-matrix">
        <ReportMatrixColGroup middleCount={section.salesPointNames.length} />
        <thead>
          <tr>
            <th
              colSpan={section.salesPointNames.length + 2}
              class="scr-section-title"
            >
              {section.title}
            </th>
          </tr>
          <tr>
            <th />
            {section.salesPointNames.map((name) => (
              <th key={name}>{name}</th>
            ))}
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.productName}>
              <td class="scr-row-label">{row.productName}</td>
              {row.quantities.map((qty, index) => (
                <td key={`${row.productName}-${index}`} class="scr-num">
                  {formatKg(qty)}
                </td>
              ))}
              <td class="scr-num">{formatKg(sumRowUnits(row.quantities))}</td>
            </tr>
          ))}
          <tr class="scr-row-total">
            <td class="scr-row-label">TOTAL</td>
            {section.totals.map((qty, index) => (
              <td key={`total-${index}`} class="scr-num">
                {formatKg(qty)}
              </td>
            ))}
            <td class="scr-num">{formatKg(sumRowUnits(section.totals))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function StockReportScreen() {
  const [report, setReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getStockReport();
        if (!cancelled) {
          setReport(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load report.",
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
    return <p class="scr-status">Loading stock report...</p>;
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
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => downloadCsv(report)}
        >
          Export CSV
        </button>
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => {
            void getAuthenticatedReports().getStockReport().then(setReport);
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
          title={`STOCK REPORT AS AT ${formatShortReportDate(report.asAtIso)}`}
          /*           meta={
            <>
              <p class="scr-as-at">
                AS at{" "}
                <span class="scr-as-at-date">{formatShortReportDate(report.asAtIso)}</span>
              </p>
              <p class="scr-generated">{formatReportDate(report.asAtIso)}</p>
            </>
          } */
        />

        <table class="scr-table sr-report-matrix">
          <ReportMatrixColGroup middleCount={2} />
          <thead>
            <tr>
              <th colSpan={4} class="scr-section-title">
                Loose Palm Oil
              </th>
            </tr>
            <tr>
              <th>SALES POINT</th>
              <th>STORAGE</th>
              <th>QUANTITY (KG)</th>
              <th>REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {report.looseRows.map((row, index) => (
              <tr key={index} class={looseRowClassName(row)}>
                <td>{row.salesPointName ?? ""}</td>
                <td>{row.storageName ?? ""}</td>
                <td class="scr-num">{formatKg(row.quantityKg)}</td>
                <td>{row.remarks ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {report.bottledSection ? (
          <BottledMatrixSection section={report.bottledSection} />
        ) : null}
        {report.otherProductsSection ? (
          <OtherProductsSection section={report.otherProductsSection} />
        ) : null}
        <ReportFooter />
      </div>
    </div>
  );
}
