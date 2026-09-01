import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { DailySalesMatrixReport } from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";
import "./DailySalesMatrixReport.css";

function formatQty(value: number): string {
  if (value === 0) {
    return "0";
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

function buildCsv(report: DailySalesMatrixReport): string {
  const lines = [
    `Company:,${report.settings.companyName}`,
    `Month:,${report.monthLabel}`,
    `Through:,${formatDisplayDate(report.asAtIso)}`,
    `Collection point:,${report.salesPointLabel}`,
    `Product:,${report.productLabel}`,
    "",
    "DAY,INDUSTRY,WHOLE SALE,RETAIL,STAFF/WORKER,PUB. RELATION,TRANSFER,TOTAL",
  ];

  for (const row of report.rows) {
    lines.push(
      [
        row.day,
        row.industry,
        row.wholeSale,
        row.retail,
        row.cdcWorker,
        row.staff,
        row.trnsfr,
        row.total,
      ].join(","),
    );
  }

  const totals = report.columnTotals;
  lines.push(
    [
      "TOTAL",
      totals.industry,
      totals.wholeSale,
      totals.retail,
      totals.cdcWorker,
      totals.staff,
      totals.trnsfr,
      totals.total,
    ].join(","),
  );

  return lines.join("\n");
}

function downloadCsv(report: DailySalesMatrixReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `daily-sales-matrix-${report.monthStartIso.slice(0, 7)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function productOptionLabel(product: {
  name: string;
  productCode: string | null;
}): string {
  return product.productCode ? `${product.name} (${product.productCode})` : product.name;
}

export function DailySalesMatrixReportDocument({
  report,
}: {
  report: DailySalesMatrixReport;
}) {
  return (
    <ReportDocumentShell
      className="scr-document wpp-pack-page"
      isEmpty={false}
      emptyMessage=""
      comments={report.comments}
      signatoryName={report.settings.signatoryName}
      signatoryTitle={report.settings.signatoryTitle}
      header={
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title={`DAILY SALES SUMMARY FOR ${report.monthLabel.toUpperCase()}`}
        />
      }
    >
      <p class="scr-meta-line">
        Through {formatDisplayDate(report.asAtIso)} · {report.salesPointLabel} ·{" "}
        {report.productLabel}
      </p>

      <div class="scr-bottled-block">
        <table class="scr-table dsr-matrix-table">
          <thead>
            <tr>
              <th class="scr-num">DAY</th>
              <th class="scr-num">INDUSTRY</th>
              <th class="scr-num">WHOLE SALE</th>
              <th class="scr-num">RETAIL</th>
              <th class="scr-num">STAFF/WORKER</th>
              <th class="scr-num">PUB. RELATION</th>
              <th class="scr-num">TRANSFER</th>
              <th class="scr-num">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.day} class="scr-row">
                <td class="scr-num">{row.day}</td>
                <td class="scr-num">{formatQty(row.industry)}</td>
                <td class="scr-num">{formatQty(row.wholeSale)}</td>
                <td class="scr-num">{formatQty(row.retail)}</td>
                <td class="scr-num">{formatQty(row.cdcWorker)}</td>
                <td class="scr-num">{formatQty(row.staff)}</td>
                <td class="scr-num">{formatQty(row.trnsfr)}</td>
                <td class="scr-num">{formatQty(row.total)}</td>
              </tr>
            ))}
            <tr class="scr-row scr-row-total">
              <td class="scr-row-label">TOTAL</td>
              <td class="scr-num scr-total-cell">{formatQty(report.columnTotals.industry)}</td>
              <td class="scr-num scr-total-cell">{formatQty(report.columnTotals.wholeSale)}</td>
              <td class="scr-num scr-total-cell">{formatQty(report.columnTotals.retail)}</td>
              <td class="scr-num scr-total-cell">{formatQty(report.columnTotals.cdcWorker)}</td>
              <td class="scr-num scr-total-cell">{formatQty(report.columnTotals.staff)}</td>
              <td class="scr-num scr-total-cell">{formatQty(report.columnTotals.trnsfr)}</td>
              <td class="scr-num scr-total-cell">{formatQty(report.columnTotals.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </ReportDocumentShell>
  );
}

export function DailySalesMatrixReportScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [salesPointId, setSalesPointId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [report, setReport] = useState<DailySalesMatrixReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getDailySalesMatrix(
          salesPointId,
          productId,
        );
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
  }, [salesPointId, productId]);

  if (loading && !report) {
    return <p class="scr-status">Loading daily sales matrix report...</p>;
  }

  if (error && !report) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  function reload() {
    void getAuthenticatedReports()
      .getDailySalesMatrix(salesPointId, productId)
      .then(setReport)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load report.");
      });
  }

  return (
    <div class="scr-page sbc-root">
      <div class="scr-toolbar no-print sbc-toolbar dsm-toolbar">      
        <div class="dsr-filters"> 
        {/* <label class="dsr-filter">
            <span>Period</span>
            <span>
              {report.monthLabel} · through {formatDisplayDate(report.asAtIso)}
            </span>
          </label> */}
          <label class="dsr-filter">         
          {/*   <span>Collection point</span> */}
            <select
              value={salesPointId == null ? "" : String(salesPointId)}
              disabled={loading}
              onChange={(event) => {
                const value = (event.currentTarget as HTMLSelectElement).value;
                setSalesPointId(value ? Number.parseInt(value, 10) : null);
              }}
            >
              <option value="">All collection points</option>
              {report.salesPointOptions.map((point) => (
                <option key={point.id} value={String(point.id)}>
                  {point.name}
                </option>
              ))}
            </select>
          </label>
          <label class="dsr-filter">
           {/*  <span>Product</span> */}
            <select
              value={productId == null ? "" : String(productId)}
              disabled={loading}
              onChange={(event) => {
                const value = (event.currentTarget as HTMLSelectElement).value;
                setProductId(value ? Number.parseInt(value, 10) : null);
              }}
            >
              <option value="">All products</option>
              {report.productOptions.map((product) => (
                <option key={product.id} value={String(product.id)}>
                  {productOptionLabel(product)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div class="scr-toolbar-actions sbc-actions">
          <button type="button" class="scr-btn" onClick={handlePrint}>
            Print
          </button>

          {windowMode ? (
            <ReportWindowSaveButton
              fileName={`daily-sales-matrix-${report.monthStartIso.slice(0, 7)}.pdf`}
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
            reportId="daily-sales-matrix-report"
            comments={report.comments}
            onSaved={reload}
          />
        </div>
      </div>

      {error ? <p class="scr-status scr-status-error no-print">{error}</p> : null}

      <DailySalesMatrixReportDocument report={report} />
    </div>
  );
}
