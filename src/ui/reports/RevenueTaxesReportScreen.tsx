import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type {
  RevenueTaxesBucketRow,
  RevenueTaxesPeriod,
  RevenueTaxesReport,
  RevenueTaxesTotals,
} from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import { isRevenueTaxesReportEmpty } from "./reportEmpty.ts";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";
import "./RevenueTaxesReport.css";

function formatMoney(value: number): string {
  if (Math.abs(value) < 0.5) {
    return "0";
  }
  return Math.round(value).toLocaleString("en-US");
}

function handlePrint(): void {
  const style = document.createElement("style");
  style.id = "rtr-print-landscape-style";
  style.textContent =
    "@media print { @page { size: A4 landscape; margin: 6mm 10mm; } }";
  document.head.appendChild(style);
  document.body.classList.add("scr-print-mode", "rtr-print-landscape");

  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("scr-print-mode", "rtr-print-landscape");
      style.remove();
    },
    { once: true },
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}

function downloadCsv(report: RevenueTaxesReport): void {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    `Period:,${report.periodLabel}`,
    `Collection point:,${report.salesPointLabel}`,
    `Basis:,Validated invoices by date issued (taxes excluded from net)`,
    "",
    "SUMMARY",
    `Invoices:,${report.totals.invoiceCount}`,
    `Net revenue:,${Math.round(report.totals.netAmount)}`,
    `VAT collected:,${Math.round(report.totals.vatAmount)}`,
    `Sales tax collected:,${Math.round(report.totals.salesTaxAmount)}`,
    `Gross:,${Math.round(report.totals.grossAmount)}`,
    "",
    report.period === "year"
      ? "BY MONTH,INVOICES,NET,VAT,SALES TAX,GROSS"
      : "BY DAY,INVOICES,NET,VAT,SALES TAX,GROSS",
    ...report.byPeriod.map((row) =>
      [
        row.label,
        row.invoiceCount,
        Math.round(row.netAmount),
        Math.round(row.vatAmount),
        Math.round(row.salesTaxAmount),
        Math.round(row.grossAmount),
      ].join(","),
    ),
    "",
    "BY SALES POINT,INVOICES,NET,VAT,SALES TAX,GROSS",
    ...report.bySalesPoint.map((row) =>
      [
        row.label,
        row.invoiceCount,
        Math.round(row.netAmount),
        Math.round(row.vatAmount),
        Math.round(row.salesTaxAmount),
        Math.round(row.grossAmount),
      ].join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `revenue-taxes-${report.period}-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function RevenueTaxesColumnGroup() {
  return (
    <colgroup>
      <col class="rtr-col-label" />
      <col class="rtr-col-invoices" />
      <col class="rtr-col-money" />
      <col class="rtr-col-money" />
      <col class="rtr-col-money" />
      <col class="rtr-col-money" />
    </colgroup>
  );
}

function SummaryTable({ totals }: { totals: RevenueTaxesTotals }) {
  return (
    <div class="rtr-section rtr-summary">
      <table class="scr-table rtr-table">
        <RevenueTaxesColumnGroup />
        <thead>
          <tr>
            <th />
            <th class="scr-num">Invoices</th>
            <th class="scr-num">Net</th>
            <th class="scr-num">VAT</th>
            <th class="scr-num">Sales tax</th>
            <th class="scr-num">Gross</th>
          </tr>
        </thead>
        <tbody>
          <tr class="scr-row scr-row-total">
            <td />
            <td class="scr-num">{totals.invoiceCount.toLocaleString("en-US")}</td>
            <td class="scr-num">{formatMoney(totals.netAmount)}</td>
            <td class="scr-num">{formatMoney(totals.vatAmount)}</td>
            <td class="scr-num">{formatMoney(totals.salesTaxAmount)}</td>
            <td class="scr-num">{formatMoney(totals.grossAmount)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MoneyTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: RevenueTaxesBucketRow[];
  emptyLabel: string;
}) {
  return (
    <div class="rtr-section">
      <h3 class="rtr-section-title">{title}</h3>
      <table class="scr-table rtr-table">
        <RevenueTaxesColumnGroup />
        <thead>
          <tr>
            <th>{title.startsWith("By collection") ? "Collection point" : "Period"}</th>
            <th class="scr-num">Invoices</th>
            <th class="scr-num">Net</th>
            <th class="scr-num">VAT</th>
            <th class="scr-num">Sales tax</th>
            <th class="scr-num">Gross</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} class="sales-muted">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} class="scr-row">
                <td>{row.label}</td>
                <td class="scr-num">{row.invoiceCount.toLocaleString("en-US")}</td>
                <td class="scr-num">{formatMoney(row.netAmount)}</td>
                <td class="scr-num">{formatMoney(row.vatAmount)}</td>
                <td class="scr-num">{formatMoney(row.salesTaxAmount)}</td>
                <td class="scr-num">{formatMoney(row.grossAmount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportDocument({ report }: { report: RevenueTaxesReport }) {
  const empty = isRevenueTaxesReportEmpty(report);

  return (
    <ReportDocumentShell
      className="scr-document rtr-document"
      isEmpty={empty}
      emptyMessage="No validated invoices in this period."
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
      <p class="rtr-basis">
        Validated invoice totals by date issued · {report.salesPointLabel} · as
        at {formatDisplayDate(report.asAtIso)}
      </p>
      <SummaryTable totals={report.totals} />
      <MoneyTable
        title={report.period === "year" ? "By month" : "By day"}
        rows={report.byPeriod}
        emptyLabel="No validated invoices in this period."
      />
      <MoneyTable
        title="By collection point"
        rows={report.bySalesPoint}
        emptyLabel="No collection-point breakdown for this period."
      />
    </ReportDocumentShell>
  );
}

export function RevenueTaxesReportScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [period, setPeriod] = useState<RevenueTaxesPeriod>("month");
  const [salesPointId, setSalesPointId] = useState<number | null>(null);
  const [report, setReport] = useState<RevenueTaxesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getRevenueTaxes(
          period,
          salesPointId,
        );
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
  }, [period, salesPointId]);

  if (loading && !report) {
    return <p class="scr-status">Loading revenue &amp; taxes report…</p>;
  }

  if (error && !report) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  return (
    <div class="scr-page sbc-root">
      <div class="scr-toolbar no-print sbc-toolbar">
        <div class="dsr-filters">
          <label class="dsr-filter">
            <span>Period</span>
            <select
              value={period}
              disabled={loading}
              onChange={(event) => {
                const value = (event.currentTarget as HTMLSelectElement).value;
                setPeriod(value === "year" ? "year" : "month");
              }}
            >
              <option value="month">Open month</option>
              <option value="year">FY to date</option>
            </select>
          </label>
          <label class="dsr-filter">
            <span>Collection point</span>
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
        </div>
        <div class="scr-toolbar-actions sbc-actions">
          <button type="button" class="scr-btn" onClick={handlePrint}>
            Print
          </button>
          {windowMode ? (
            <ReportWindowSaveButton
              fileName={`revenue-taxes-${report.period}-${report.asAtIso}.pdf`}
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
            reportId="revenue-taxes-report"
            comments={report.comments}
            onSaved={(comments) => setReport({ ...report, comments })}
          />
        </div>
      </div>
      {loading ? <p class="scr-status no-print">Refreshing…</p> : null}
      {error ? <p class="scr-status scr-status-error no-print">{error}</p> : null}
      <ReportDocument report={report} />
    </div>
  );
}
