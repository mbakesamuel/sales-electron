import { Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type { DailySalesReport } from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

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

function formatQty(value: number | null | undefined): string {
  if (value == null) {
    return "";
  }
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

function buildCsv(report: DailySalesReport): string {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    `Report date:,${formatReportDate(report.reportDateIso)}`,
    `Sales point:,${report.salesPointLabel}`,
    "",
    "SN,CUSTOMER,DO. NO.,DATE ISSUED,VEHICLE. NO,QUANTITY,DO. BALANCE",
  ];

  for (const section of report.sections) {
    lines.push(`${section.productName},,,,,,`);
    for (const row of section.rows) {
      lines.push(
        [
          row.sn,
          row.customerName,
          row.deliveryOrderNo ?? "",
          formatShortReportDate(row.dateIssuedIso),
          row.vehicleNumber ?? "",
          row.quantity,
          row.doBalance ?? "",
        ].join(","),
      );
    }
    lines.push(
      [
        "SUBTOTAL",
        "",
        "",
        "",
        "",
        section.subtotalQuantity,
        section.subtotalDoBalance,
      ].join(","),
    );
    lines.push("");
  }

  lines.push(
    [
      "GRAND TOTAL",
      "",
      "",
      "",
      "",
      report.grandTotalQuantity,
      report.grandTotalDoBalance,
    ].join(","),
  );
  lines.push("");
  lines.push("SUMMARY BY CUSTOMER TYPE,,,,QUANTITY,");
  for (const row of report.summaryRows) {
    lines.push([row.label, "", "", "", "", row.quantity].join(","));
  }
  lines.push(["GRAND TOTAL", "", "", "", "", report.summaryGrandTotal].join(","));

  return lines.join("\n");
}

function downloadCsv(report: DailySalesReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `daily-sales-${report.reportDateIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DailySalesReportDocument({ report }: { report: DailySalesReport }) {
  return (
    <div class="scr-document wpp-pack-page">
      <ReportHeader
        companyName={report.settings.companyName}
        department={report.settings.department ?? null}
        serviceName={report.settings.serviceName ?? null}
        title={`DAILY SALES REPORT OF ${formatShortReportDate(report.reportDateIso)}`}
       /*  meta={
          <p class="dsr-sales-point-meta">
            SALES POINT NAME : {report.salesPointLabel}
          </p>
        } */
      />

      <p class="scr-generated">
        Report date: {formatReportDate(report.reportDateIso)}
      </p>

      {report.sections.length === 0 ? (
        <p class="scr-status">No validated sales for this date.</p>
      ) : (
        <div class="scr-bottled-block">
          <table class="scr-table dsr-table">
            <thead>
              <tr>
                <th>SN</th>
                <th>CUSTOMER</th>
                <th>DO. NO.</th>
                <th>DATE ISSUED</th>
                <th>VEHICLE. NO</th>
                <th class="scr-num">QUANTITY</th>
                <th class="scr-num">DO. BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {report.sections.map((section) => (
                <Fragment key={section.productName}>
                  <tr key={`${section.productName}-header`} class="scr-row-header">
                    <td colSpan={7}>
                      <strong>{section.productName.toUpperCase()}</strong>
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={`${section.productName}-${row.sn}`} class="scr-row">
                      <td>{row.sn}</td>
                      <td>{row.customerName}</td>
                      <td>{row.deliveryOrderNo ?? ""}</td>
                      <td>{formatShortReportDate(row.dateIssuedIso)}</td>
                      <td>{row.vehicleNumber ?? ""}</td>
                      <td class="scr-num">{formatQty(row.quantity)}</td>
                      <td class="scr-num">{formatQty(row.doBalance)}</td>
                    </tr>
                  ))}
                  <tr key={`${section.productName}-subtotal`} class="scr-row scr-row-total">
                    <td colSpan={5} class="scr-row-label">
                      SUBTOTAL
                    </td>
                    <td class="scr-num scr-total-cell">
                      {formatQty(section.subtotalQuantity)}
                    </td>
                    <td class="scr-num scr-total-cell">
                      {formatQty(section.subtotalDoBalance)}
                    </td>
                  </tr>
                </Fragment>
              ))}
              <tr class="scr-row scr-row-total">
                <td colSpan={5} class="scr-row-label">
                  GRAND TOTAL
                </td>
                <td class="scr-num scr-total-cell">
                  {formatQty(report.grandTotalQuantity)}
                </td>
                <td class="scr-num scr-total-cell">
                  {formatQty(report.grandTotalDoBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div class="scr-bottled-block">
        <table class="scr-table dsr-summary-table">
          <thead>
            <tr>
              <th colSpan={2} class="scr-section-title">
                SUMMARY BY CUSTOMER TYPE
              </th>
            </tr>
          </thead>
          <tbody>
            {report.summaryRows.map((row) => (
              <tr key={row.id} class="scr-row">
                <td class="scr-row-label">{row.label}</td>
                <td class="scr-num">{formatQty(row.quantity)}</td>
              </tr>
            ))}
            <tr class="scr-row scr-row-total">
              <td class="scr-row-label">GRAND TOTAL</td>
              <td class="scr-num scr-total-cell">{formatQty(report.summaryGrandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ReportCommentsSection comments={report.comments} />
      <ReportFooter />
    </div>
  );
}

export function DailySalesReportScreen() {
  const [reportDateIso, setReportDateIso] = useState(todayIsoDate());
  const [salesPointId, setSalesPointId] = useState<number | null>(null);
  const [report, setReport] = useState<DailySalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getDailySales(
          reportDateIso,
          salesPointId,
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
  }, [reportDateIso, salesPointId]);

  if (loading && !report) {
    return <p class="scr-status">Loading daily sales report...</p>;
  }

  if (error && !report) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  function reload() {
    void getAuthenticatedReports()
      .getDailySales(reportDateIso, salesPointId)
      .then(setReport)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load report.");
      });
  }

  return (
    <div class="scr-page sbc-root">
      <div class="scr-toolbar no-print sbc-toolbar">
        <div class="dsr-filters">
          <label class="dsr-filter">
            <span>Date</span>
            <input
              type="date"
              value={reportDateIso}
              disabled={loading}
              onInput={(event) =>
                setReportDateIso((event.currentTarget as HTMLInputElement).value)
              }
            />
          </label>
          <label class="dsr-filter">
            <span>Sales point</span>
            <select
              value={salesPointId == null ? "" : String(salesPointId)}
              disabled={loading}
              onChange={(event) => {
                const value = (event.currentTarget as HTMLSelectElement).value;
                setSalesPointId(value ? Number.parseInt(value, 10) : null);
              }}
            >
              <option value="">All sales points</option>
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
          <button
            type="button"
            class="scr-btn scr-btn-secondary"
            onClick={() => downloadCsv(report)}
          >
            Export CSV
          </button>
          <ReportCommentsEditor
            reportId="daily-sales-report"
            comments={report.comments}
            onSaved={reload}
          />
          <button type="button" class="scr-btn scr-btn-secondary" onClick={reload}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <p class="scr-status scr-status-error no-print">{error}</p> : null}

      <DailySalesReportDocument report={report} />
    </div>
  );
}
