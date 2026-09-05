import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type {
  StockReport,
  StockReportBottledSection,
  StockReportKernelSplitSection,
  StockReportLocationRow,
  StockReportLocationSection,
  StockReportSalesPointQtySection,
  StockReportSection,
} from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import { HIDE_ZERO_ROWS_HINT, isStockReportEmpty } from "./reportEmpty.ts";
import { printWeeklyPortraitDocument } from "./printWeeklyPortraitDocument.ts";
import "./StockCommitmentReport.css";


function formatKg(value: number | null | undefined): string {
  if (value == null || value === 0) {
    return "";
  }
  const rounded = Math.round(value);
  if (rounded < 0) {
    return `(${Math.abs(rounded).toLocaleString("en-US")})`;
  }
  return rounded.toLocaleString("en-US");
}

function formatUnits(value: number | null | undefined): string {
  if (value == null || value === 0) {
    return "-";
  }
  return Math.round(value).toLocaleString("en-US");
}

function sumRowUnits(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function locationRowClassName(row: StockReportLocationRow): string {
  if (row.kind === "subtotal" || row.kind === "grand_total") {
    return "scr-row scr-row-total";
  }
  return "scr-row";
}

function handlePrint(): void {
  printWeeklyPortraitDocument();
}

function LocationDetailColGroup() {
  return (
    <colgroup>
      <col class="sr-col-label" />
      <col class="sr-col-storage" />
      <col class="sr-col-qty" />
      <col class="sr-col-remarks" />
    </colgroup>
  );
}

function LocationDetailSection({
  section,
  oilGrandTotalKg,
}: {
  section: StockReportLocationSection;
  oilGrandTotalKg: number;
}) {
  return (
    <div class="scr-bottled-block mdr-section">
      <table class="scr-table sr-report-matrix sr-location-detail">
        <LocationDetailColGroup />
        <thead>
          <tr>
            <th colSpan={4} class="scr-section-title">
              {section.title}
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
          {section.rows.map((row, index) => (
            <tr key={`${section.productCatId}-${index}`} class={locationRowClassName(row)}>
              <td>{row.salesPointName ?? ""}</td>
              <td class="sr-storage" title={row.storageName ?? undefined}>
                {row.storageName ?? ""}
              </td>
              <td class="scr-num">{formatKg(row.quantityKg)}</td>
              <td class="sr-remarks" title={row.remarks ?? undefined}>
                {row.remarks ?? ""}
              </td>
            </tr>
          ))}
          {section.showOilGrandTotalAfter ? (
            <tr class="scr-row scr-row-total">
              <td />
              <td>GRAND TOTAL</td>
              <td class="scr-num scr-total-cell">{formatKg(oilGrandTotalKg)}</td>
              <td />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function BottledMatrixSection({ section }: { section: StockReportBottledSection }) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table scr-bottled-table sr-report-matrix sr-bottled-products">
        <colgroup>
          <col class="sr-col-label" />
          {section.columns.map((column) => (
            <col key={column.id} class="sr-bottled-product-col" />
          ))}
          <col class="sr-col-last" />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={section.columns.length + 2} class="scr-section-title">
              {section.title}
            </th>
          </tr>
          <tr>
            <th />
            {section.columns.map((column) => (
              <th key={column.id} class="sr-bottled-product-head" title={column.label}>
                {column.label}
              </th>
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
              <td class="scr-num">{formatUnits(sumRowUnits(row.unitCounts))}</td>
            </tr>
          ))}
          <tr class="scr-row-total">
            <td class="scr-row-label">TOTAL</td>
            {section.columnTotals.map((count, index) => (
              <td key={`total-${index}`} class="scr-num">
                {formatUnits(count)}
              </td>
            ))}
            <td class="scr-num">{formatUnits(sumRowUnits(section.columnTotals))}</td>
          </tr>
          <tr>
            <td class="scr-row-label">LITRES</td>
            {section.litres.map((litre, index) => (
              <td key={`litres-${index}`} class="scr-num">
                {formatUnits(litre)}
              </td>
            ))}
            <td class="scr-num">{formatUnits(sumRowUnits(section.litres))}</td>
          </tr>
          <tr>
            <td class="scr-row-label">KGS</td>
            {section.kgs.map((kg, index) => (
              <td key={`kgs-${index}`} class="scr-num">
                {formatUnits(kg)}
              </td>
            ))}
            <td class="scr-num scr-total-cell">{formatUnits(section.totalKgs)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function KernelSplitSection({ section }: { section: StockReportKernelSplitSection }) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table sr-report-matrix sr-location-detail">
        <LocationDetailColGroup />
        <thead>
          <tr>
            <th colSpan={4} class="scr-section-title">
              {section.title}
            </th>
          </tr>
          <tr>
            <th />
            <th>CRACKED</th>
            <th>UNCRACKED</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.salesPointName}>
              <td class="scr-row-label">{row.salesPointName}</td>
              <td class="scr-num">{formatKg(row.crackedKg)}</td>
              <td class="scr-num">{formatKg(row.uncrackedKg)}</td>
              <td />
            </tr>
          ))}
          <tr class="scr-row-total">
            <td class="scr-row-label">{section.totals.salesPointName}</td>
            <td class="scr-num">{formatKg(section.totals.crackedKg)}</td>
            <td class="scr-num">{formatKg(section.totals.uncrackedKg)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SalesPointQtySection({
  section,
}: {
  section: StockReportSalesPointQtySection;
}) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table sr-report-matrix sr-location-detail">
        <LocationDetailColGroup />
        <thead>
          <tr>
            <th colSpan={4} class="scr-section-title">
              {section.title}
            </th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr key={row.salesPointName}>
              <td class="scr-row-label">{row.salesPointName}</td>
              <td />
              <td class="scr-num">{formatKg(row.quantityKg)}</td>
              <td />
            </tr>
          ))}
          <tr class="scr-row-total">
            <td class="scr-row-label">TOTAL</td>
            <td />
            <td class="scr-num">{formatKg(section.totalKg)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function renderSection(
  section: StockReportSection,
  oilGrandTotalKg: number,
) {
  switch (section.kind) {
    case "location_detail":
      return (
        <LocationDetailSection
          key={`loc-${section.productCatId}`}
          section={section}
          oilGrandTotalKg={oilGrandTotalKg}
        />
      );
    case "bottled":
      return <BottledMatrixSection key={`bot-${section.productCatId}`} section={section} />;
    case "kernel_split":
      return <KernelSplitSection key={`ker-${section.productCatId}`} section={section} />;
    case "sales_point_qty":
      return <SalesPointQtySection key={`qty-${section.productCatId}`} section={section} />;
    default:
      return null;
  }
}

function buildCsv(report: StockReport): string {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `AS AT:,${report.asAtIso}`,
    "",
  ].filter((line) => line.length > 0);

  for (const section of report.sections) {
    lines.push(section.title);
    if (section.kind === "location_detail") {
      lines.push("SALES POINT,STORAGE,QUANTITY (KG),REMARKS");
      for (const row of section.rows) {
        lines.push(
          [
            row.salesPointName ?? "",
            row.storageName ?? "",
            row.quantityKg ?? "",
            row.remarks ?? "",
          ].join(","),
        );
      }
      if (section.showOilGrandTotalAfter) {
        lines.push(`,,${report.oilGrandTotalKg},`);
      }
    } else if (section.kind === "bottled") {
      lines.push(["", ...section.columns.map((c) => c.label), "TOTAL"].join(","));
      for (const row of section.rows) {
        lines.push(
          [row.salesPointName, ...row.unitCounts, sumRowUnits(row.unitCounts)].join(","),
        );
      }
      lines.push(["TOTAL", ...section.columnTotals, sumRowUnits(section.columnTotals)].join(","));
      lines.push(["LITRES", ...section.litres, sumRowUnits(section.litres)].join(","));
      lines.push(["KGS", ...section.kgs, section.totalKgs].join(","));
    } else if (section.kind === "kernel_split") {
      lines.push("SALES POINT,CRACKED,UNCRACKED,");
      for (const row of section.rows) {
        lines.push(
          [row.salesPointName, row.crackedKg, row.uncrackedKg, ""].join(","),
        );
      }
      lines.push(
        [
          section.totals.salesPointName,
          section.totals.crackedKg,
          section.totals.uncrackedKg,
          "",
        ].join(","),
      );
    } else if (section.kind === "sales_point_qty") {
      lines.push(`SALES POINT,,${section.quantityLabel},`);
      for (const row of section.rows) {
        lines.push([row.salesPointName, "", row.quantityKg, ""].join(","));
      }
      lines.push(["TOTAL", "", section.totalKg, ""].join(","));
    }
    lines.push("");
  }

  return lines.join("\n");
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

export function StockReportDocument({ report }: { report: StockReport }) {
  const empty = isStockReportEmpty(report);

  return (
    <ReportDocumentShell
      className="scr-document sr-stock-compact sr-stock-report wpp-pack-page weekly-report-tight"
      isEmpty={empty}
      emptyMessage={`No stock quantities to display as at ${formatDisplayDate(report.asAtIso)}.`}
      emptyHint={HIDE_ZERO_ROWS_HINT}
      comments={report.comments}
      signatoryName={report.settings.signatoryName}
      signatoryTitle={report.settings.signatoryTitle}
      header={
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title={`STOCK REPORT AS AT ${formatDisplayDate(report.asAtIso)}`}
        />
      }
    >
      {report.sections
        .filter((section) => section.kind !== "bottled")
        .map((section) => renderSection(section, report.oilGrandTotalKg))}
      {report.sections
        .filter((section) => section.kind === "bottled")
        .map((section) => renderSection(section, report.oilGrandTotalKg))}
    </ReportDocumentShell>
  );
}

export function StockReportScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
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
        {windowMode ? (
          <ReportWindowSaveButton fileName={`stock-report-${report.asAtIso}.pdf`} />
        ) : null}
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => downloadCsv(report)}
        >
          Export CSV
        </button>
        <ReportCommentsEditor
          reportId="stock-report"
          comments={report.comments}
          onSaved={() => {
            void getAuthenticatedReports().getStockReport().then(setReport);
          }}
        />
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

      <StockReportDocument report={report} />
    </div>
  );
}
