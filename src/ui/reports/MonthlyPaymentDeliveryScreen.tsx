import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type { MonthlyPaymentDeliveryReport } from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import {
  HIDE_ZERO_ROWS_HINT,
  isMonthlyPaymentDeliveryReportEmpty,
} from "./reportEmpty.ts";
import "./StockCommitmentReport.css";
import "./MonthlyPaymentDeliveryReport.css";

function formatKg(value: number): string {
  if (Math.abs(value) < 0.0005) {
    return "—";
  }
  return Math.round(value).toLocaleString("en-US");
}

function formatMoney(value: number): string {
  if (Math.abs(value) < 0.0005) {
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

function downloadCsv(report: MonthlyPaymentDeliveryReport): void {
  const lines = [
    ["WEEKS", "DATES", "PAYMENTS_KGS", "PAYMENTS_FCFA", "DELIVERIES_KGS", "DELIVERIES_FCFA"],
    ...report.weeks.map((week) => [
      String(week.weekIndex),
      week.datesLabel,
      String(Math.round(week.paymentsKg)),
      String(Math.round(week.paymentsValue)),
      String(Math.round(week.deliveriesKg)),
      String(Math.round(week.deliveriesValue)),
    ]),
    [
      "",
      "TOTAL",
      String(Math.round(report.totals.paymentsKg)),
      String(Math.round(report.totals.paymentsValue)),
      String(Math.round(report.totals.deliveriesKg)),
      String(Math.round(report.totals.deliveriesValue)),
    ],
  ];
  const csv = lines.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `monthly-payment-delivery-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ReportTable({ report }: { report: MonthlyPaymentDeliveryReport }) {
  return (
    <div class="scr-bottled-block mpd-section">
      <table class="scr-table mpd-table">
        <thead>
          <tr>
            <th rowSpan={3} class="mpd-weeks-col">
              WEEKS
            </th>
            <th rowSpan={3} class="mpd-dates-col">
              DATES
            </th>
            <th colSpan={4} class="mpd-banner">
              SALES WITHOUT TAXES
            </th>
          </tr>
          <tr>
            <th colSpan={2}>PAYMENTS</th>
            <th colSpan={2}>DELIVERIES</th>
          </tr>
          <tr>
            <th>KGS</th>
            <th>F.CFA</th>
            <th>KGS</th>
            <th>F.CFA</th>
          </tr>
        </thead>
        <tbody>
          {report.weeks.map((week) => (
            <tr key={week.weekIndex} class="scr-row">
              <td class="mpd-center">{week.weekIndex}</td>
              <td class="mpd-center">{week.datesLabel}</td>
              <td class="scr-num">{formatKg(week.paymentsKg)}</td>
              <td class="scr-num">{formatMoney(week.paymentsValue)}</td>
              <td class="scr-num">{formatKg(week.deliveriesKg)}</td>
              <td class="scr-num">{formatMoney(week.deliveriesValue)}</td>
            </tr>
          ))}
          <tr class="scr-row scr-row-total">
            <td />
            <td class="mpd-center">TOTAL</td>
            <td class="scr-num">{formatKg(report.totals.paymentsKg)}</td>
            <td class="scr-num">{formatMoney(report.totals.paymentsValue)}</td>
            <td class="scr-num">{formatKg(report.totals.deliveriesKg)}</td>
            <td class="scr-num">{formatMoney(report.totals.deliveriesValue)}</td>
          </tr>
        </tbody>
      </table>
      <p class="mpd-legend no-print">
        Payments = bottled oil sales · Deliveries = sales of all other products · Values are line net
        (without taxes).
      </p>
    </div>
  );
}

function ReportDocument({ report }: { report: MonthlyPaymentDeliveryReport }) {
  const empty = isMonthlyPaymentDeliveryReportEmpty(report);

  return (
    <ReportDocumentShell
      className="scr-document mpd-document"
      isEmpty={empty}
      emptyMessage="No payment or delivery data for this month."
      emptyHint={HIDE_ZERO_ROWS_HINT}
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
      <ReportTable report={report} />
    </ReportDocumentShell>
  );
}

export function MonthlyPaymentDeliveryScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] = useState<MonthlyPaymentDeliveryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getMonthlyPaymentDelivery();
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
    return <p class="scr-status">Loading monthly payment/delivery report…</p>;
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
            fileName={`monthly-payment-delivery-${report.asAtIso}.pdf`}
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
          reportId="monthly-payment-delivery-report"
          comments={report.comments}
          onSaved={(comments) => setReport({ ...report, comments })}
        />
      </div>
      <ReportDocument report={report} />
    </div>
  );
}
