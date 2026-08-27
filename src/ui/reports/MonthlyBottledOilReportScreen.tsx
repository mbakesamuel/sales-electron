import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { MonthlyBottledOilReport } from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import "./StockCommitmentReport.css";
import "./MonthlyBottledOilReport.css";

function formatQty(value: number): string {
  if (value === 0) {
    return "0";
  }
  return Math.round(value).toLocaleString("en-US");
}

function formatAmount(value: number): string {
  if (value === 0) {
    return "0";
  }
  return Math.round(value).toLocaleString("en-US");
}

function handlePrint(): void {
  const style = document.createElement("style");
  style.id = "mbo-print-landscape-style";
  style.textContent =
    "@media print { @page { size: A4 landscape; margin: 6mm 10mm; } }";
  document.head.appendChild(style);
  document.body.classList.add("scr-print-mode", "mbo-print-landscape");

  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("scr-print-mode", "mbo-print-landscape");
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

function downloadCsv(report: MonthlyBottledOilReport): void {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `Financial Year:,${report.financialYear}`,
    `Month:,${report.monthName}`,
    `As at:,${report.asAtIso}`,
    "",
    [
      "DATE",
      "NAME/CUSTOMER",
      "ADDRESS",
      "1x20L",
      "3x5L",
      "1x15L",
      "RECEIVED BY",
      "AMOUNT",
      "VEH. C. NO",
    ].join(","),
  ];

  for (const row of report.rows) {
    lines.push(
      [
        formatDisplayDate(row.dateIssued),
        `"${row.customerName.replace(/"/g, '""')}"`,
        `"${row.address.replace(/"/g, '""')}"`,
        String(row.qty20L),
        String(row.qty3x5L),
        String(row.qty15L),
        `"${row.receivedBy.replace(/"/g, '""')}"`,
        String(row.amount),
        `"${row.vehConsignmentNo.replace(/"/g, '""')}"`,
      ].join(","),
    );
  }

  lines.push(
    [
      "TOTAL",
      "",
      "",
      String(report.totals.qty20L),
      String(report.totals.qty3x5L),
      String(report.totals.qty15L),
      "",
      String(report.totals.amount),
      "",
    ].join(","),
  );

  const csv = lines.filter((line) => line.length > 0).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `monthly-bottled-oil-${report.financialYear}-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ReportDocument({ report }: { report: MonthlyBottledOilReport }) {
  return (
    <div class="scr-document mbo-document">
      <ReportHeader
        companyName={report.settings.companyName}
        department={report.settings.department ?? null}
        serviceName={report.settings.serviceName ?? null}
        title={""}      
      />

      <section class="mbo-routing" aria-label="Routing">
        <p class="mbo-routing-from">
          <span class="mbo-routing-key">From:</span> MPOS
        </p>
        <p class="mbo-routing-to">
          <span class="mbo-routing-key">TO:</span> Accounts Manager
          <span class="mbo-routing-date">
            {formatDisplayDate(report.asAtIso)}
          </span>
        </p>
      </section>


      <h1 class="mbo-title">BOTTLED PALM OIL ISSUED TO GM'S PR FOR {report.monthName} {report.financialYear}</h1>


      {report.rows.length === 0 ? (
        <p class="mbo-empty">
          No Bottle Oil Ration or Public relation sales in this period.
        </p>
      ) : (
        <div class="mbo-section">
          <table class="scr-table mbo-table">
            <thead>
              <tr>
                <th rowSpan={2}>DATE</th>
                <th rowSpan={2}>NAME/CUSTOMER</th>
                <th rowSpan={2}>ADDRESS</th>
                <th class="mbo-pack-group" colSpan={3}>
                  PRODUCTS
                </th>
                <th rowSpan={2}>RECEIVED BY</th>
                <th rowSpan={2}>AMOUNT</th>
                <th rowSpan={2}>VEH. C. NO</th>
              </tr>
              <tr>
                <th class="mbo-pack-col">1x20L</th>
                <th class="mbo-pack-col">3x5L</th>
                <th class="mbo-pack-col">1x15L</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.saleId} class="scr-row">
                  <td>{formatDisplayDate(row.dateIssued)}</td>
                  <td>{row.customerName}</td>
                  <td>{row.address || "—"}</td>
                  <td class="scr-num mbo-pack-col">{formatQty(row.qty20L)}</td>
                  <td class="scr-num mbo-pack-col">{formatQty(row.qty3x5L)}</td>
                  <td class="scr-num mbo-pack-col">{formatQty(row.qty15L)}</td>
                  <td>{row.receivedBy || "—"}</td>
                  <td class="scr-num">{formatAmount(row.amount)}</td>
                  <td>{row.vehConsignmentNo || "—"}</td>
                </tr>
              ))}
              <tr class="scr-row scr-row-total">
                <td class="mbo-total-label" colSpan={3}>
                  TOTAL
                </td>
                <td class="scr-num mbo-pack-col">
                  {formatQty(report.totals.qty20L)}
                </td>
                <td class="scr-num mbo-pack-col">
                  {formatQty(report.totals.qty3x5L)}
                </td>
                <td class="scr-num mbo-pack-col">
                  {formatQty(report.totals.qty15L)}
                </td>
                <td />
                <td class="scr-num">{formatAmount(report.totals.amount)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    
      <ReportCommentsSection comments={report.comments} />

      <section class="mbo-signatories" aria-label="Signatories">
        <div class="mbo-signatory">
          <p class="mbo-signatory-label">Prepared By</p>
        </div>
        <div class="mbo-signatory">
          <p class="mbo-signatory-label">Checked By</p>
        </div>
        <div class="mbo-signatory">
          <p class="mbo-signatory-label">Approved By</p>
        </div>
      </section>
    </div>
  );
}

export function MonthlyBottledOilReportScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] = useState<MonthlyBottledOilReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getMonthlyBottledOil();
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
    return <p class="scr-status">Loading bottled oil monthly report…</p>;
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  return (
    <div class="scr-page mbo-page">
      <div class="scr-toolbar no-print">
        <button type="button" class="scr-btn" onClick={handlePrint}>
          Print
        </button>
        {windowMode ? (
          <ReportWindowSaveButton
            fileName={`monthly-bottled-oil-${report.financialYear}-${report.asAtIso}.pdf`}
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
          reportId="monthly-bottled-oil-report"
          comments={report.comments}
          onSaved={(comments) => setReport({ ...report, comments })}
        />
      </div>
      <ReportDocument report={report} />
    </div>
  );
}
