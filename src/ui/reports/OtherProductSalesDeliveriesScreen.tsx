import { useEffect, useState } from "preact/hooks";
import { Fragment } from "preact";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  OtherProductSalesDeliveriesMetrics,
  OtherProductSalesDeliveriesReport,
  OtherProductSalesDeliveriesRow,
} from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import "./StockCommitmentReport.css";
import "./OtherProductSalesDeliveriesReport.css";

function formatKg(value: number): string {
  if (Math.abs(value) < 0.5) {
    return "—";
  }
  return Math.round(value).toLocaleString("en-US");
}

function formatValue(value: number): string {
  if (Math.abs(value) < 0.5) {
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

function csvKg(value: number): string {
  return Math.abs(value) < 0.5 ? "" : String(Math.round(value));
}

function csvValue(value: number): string {
  return Math.abs(value) < 0.5 ? "" : String(Math.round(value));
}

function metricsCsv(metrics: OtherProductSalesDeliveriesMetrics): string[] {
  return [
    csvKg(metrics.paymentsKg),
    csvValue(metrics.paymentsValue),
    csvKg(metrics.deliveriesKg),
    csvValue(metrics.deliveriesValue),
  ];
}

function downloadCsv(report: OtherProductSalesDeliveriesReport): void {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `Financial Year:,${report.financialYear}`,
    `Month:,${report.monthName}`,
    `As at:,${report.asAtIso}`,
    "",
    [
      "SALES POINT",
      "PRODUCT",
      "PAYMENTS KGS",
      "PAYMENTS F.CFA",
      "DELIVERIES KGS",
      "DELIVERIES F.CFA",
    ].join(","),
  ];

  for (const section of report.sections) {
    for (const [index, row] of section.productRows.entries()) {
      lines.push(
        [
          index === 0 ? row.salesPointLabel : "",
          row.productLabel,
          ...metricsCsv(row),
        ].join(","),
      );
    }
    lines.push(
      [
        section.subtotal.salesPointLabel,
        "",
        ...metricsCsv(section.subtotal),
      ].join(","),
    );
  }

  lines.push(
    [
      report.grandTotal.salesPointLabel,
      "",
      ...metricsCsv(report.grandTotal),
    ].join(","),
  );

  const csv = lines.filter((line) => line.length > 0).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `other-product-sales-deliveries-${report.financialYear}-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCells({ row }: { row: OtherProductSalesDeliveriesRow }) {
  return (
    <>
      <td class="scr-num">{formatKg(row.paymentsKg)}</td>
      <td class="scr-num">{formatValue(row.paymentsValue)}</td>
      <td class="scr-num">{formatKg(row.deliveriesKg)}</td>
      <td class="scr-num">{formatValue(row.deliveriesValue)}</td>
    </>
  );
}

function ReportDocument({ report }: { report: OtherProductSalesDeliveriesReport }) {
  if (report.sections.length === 0) {
    return (
      <div class="scr-document opsd-document">
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title={report.reportTitle}
        />
        <p class="opsd-empty">
          No other-product (non-LPO / non-bottled) sales in this period.
        </p>
        <ReportCommentsSection comments={report.comments} />
        <ReportFooter
          name={report.settings.signatoryName}
          label={report.settings.signatoryTitle}
        />
      </div>
    );
  }

  return (
    <div class="scr-document opsd-document">
      <ReportHeader
        companyName={report.settings.companyName}
        department={report.settings.department ?? null}
        serviceName={report.settings.serviceName ?? null}
        title={report.reportTitle}
      />
      <div class="opsd-section">
        <table class="scr-table opsd-table">
          <thead>
            <tr>
              <th class="opsd-sp-col" rowSpan={3}>
                SALES POINT
              </th>
              <th class="opsd-product-col" rowSpan={3}>
                PRODUCT
              </th>
              <th colSpan={4}>SALES WITHOUT TAXES</th>
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
            {report.sections.map((section) => (
              <Fragment key={section.salesPointId ?? section.salesPointName}>
                {section.productRows.map((row, index) => (
                  <tr key={row.id} class="scr-row">
                    {index === 0 ? (
                      <td
                        class="opsd-sp-col"
                        rowSpan={section.productRows.length}
                      >
                        {row.salesPointLabel}
                      </td>
                    ) : null}
                    <td class="opsd-product-col">{row.productLabel}</td>
                    <MetricCells row={row} />
                  </tr>
                ))}
                <tr key={section.subtotal.id} class="scr-row scr-row-total">
                  <td class="opsd-sp-col" colSpan={2}>
                    {section.subtotal.salesPointLabel}
                  </td>
                  <MetricCells row={section.subtotal} />
                </tr>
              </Fragment>
            ))}
            <tr class="scr-row scr-row-total">
              <td class="opsd-sp-col" colSpan={2}>
                {report.grandTotal.salesPointLabel}
              </td>
              <MetricCells row={report.grandTotal} />
            </tr>
          </tbody>
        </table>
      </div>
      <p class="opsd-footnote">
        Sales without taxes · PAYMENTS blank for other products · kg rounded to
        0 dp
      </p>
      <ReportCommentsSection comments={report.comments} />
      <ReportFooter
        name={report.settings.signatoryName}
        label={report.settings.signatoryTitle}
      />
    </div>
  );
}

export function OtherProductSalesDeliveriesScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] =
    useState<OtherProductSalesDeliveriesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data =
          await getAuthenticatedReports().getOtherProductSalesDeliveries();
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
    return (
      <p class="scr-status">Loading other product sales and deliveries…</p>
    );
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  return (
    <div class="scr-page opsd-page">
      <div class="scr-toolbar no-print">
        <button type="button" class="scr-btn" onClick={handlePrint}>
          Print
        </button>
        {windowMode ? (
          <ReportWindowSaveButton
            fileName={`other-product-sales-deliveries-${report.financialYear}-${report.asAtIso}.pdf`}
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
          reportId="other-product-sales-deliveries-report"
          initialText={report.comments}
          onSaved={(comments) => setReport({ ...report, comments })}
        />
      </div>
      <ReportDocument report={report} />
    </div>
  );
}
