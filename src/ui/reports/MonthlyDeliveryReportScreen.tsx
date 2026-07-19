import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  MonthlyDeliveryBudgetSection,
  MonthlyDeliveryReport,
} from "../../shared/reports.types.ts";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import "./StockCommitmentReport.css";
import "./MonthlyDeliveryReport.css";

interface MonthlyDeliveryReportScreenProps {
  half: 1 | 2;
}

function formatTons(value: number): string {
  if (value === 0) {
    return "0";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

/** Display FCFA amounts in thousands (000 FCFA). */
function toThousands(value: number): number {
  return value / 1000;
}

function formatValue(value: number): string {
  const thousands = toThousands(value);
  if (thousands === 0) {
    return "0";
  }
  return Math.round(thousands).toLocaleString("en-US");
}

function formatAvgPrice(value: number): string {
  if (value === 0) {
    return "0";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatPct(actual: number, estimate: number): string {
  if (estimate === 0) {
    return actual === 0 ? "0.00%" : "—";
  }
  return `${((actual / estimate) * 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatVariance(value: number): string {
  const thousands = Math.round(toThousands(value));
  const abs = Math.abs(thousands).toLocaleString("en-US");
  return thousands < 0 ? `(${abs})` : abs;
}

function handlePrint(): void {
  const style = document.createElement("style");
  style.id = "mdr-print-landscape-style";
  style.textContent = `@media print { @page { size: landscape; margin: 10mm; } }`;
  document.head.appendChild(style);
  document.body.classList.add("scr-print-mode", "mdr-print-landscape");

  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("scr-print-mode", "mdr-print-landscape");
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

function buildCsv(report: MonthlyDeliveryReport): string {
  const monthHeaders = report.monthColumns.flatMap((column) => [
    `${column.label} TONS`,
    `${column.label} VALUE (000 FCFA)`,
  ]);
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `Financial Year:,${report.financialYear}`,
    `Half:,${report.half}`,
    `Value unit:,000 FCFA`,
    "",
    ["", ...monthHeaders, "TODATE TONS", "TODATE VALUE (000 FCFA)"].join(","),
  ];

  for (const section of report.sections) {
    lines.push(section.title);
    for (const row of section.rows) {
      const monthValues = row.months.flatMap((cell) => [
        cell.tons,
        Math.round(toThousands(cell.value)),
      ]);
      lines.push(
        [
          row.label,
          ...monthValues,
          row.toDate.tons,
          Math.round(toThousands(row.toDate.value)),
        ].join(","),
      );
    }
    lines.push("");
  }

  function appendBudgetCsv(
    section: MonthlyDeliveryReport["budgetSection"],
    includeGrand: boolean,
  ): void {
    lines.push(section.title);
    const header = [
      "",
      ...section.metrics.flatMap((metric) => [
        `${metric.tonsLabel} ESTIMATE`,
        `${metric.tonsLabel} ACTUAL`,
        `${metric.valueLabel} ESTIMATE (000 FCFA)`,
        `${metric.valueLabel} ACTUAL (000 FCFA)`,
      ]),
    ];
    if (includeGrand) {
      header.push(
        "G.TOTAL ESTIMATE (000 FCFA)",
        "G.TOTAL ACTUAL (000 FCFA)",
        "variance (000 FCFA)",
      );
    }
    lines.push(header.join(","));

    const toDate = [
      "TO-DATE",
      ...section.metrics.flatMap((metric) => [
        metric.estimateTons,
        metric.actualTons,
        Math.round(toThousands(metric.estimateValue)),
        Math.round(toThousands(metric.actualValue)),
      ]),
    ];
    if (includeGrand) {
      toDate.push(
        Math.round(toThousands(section.grandEstimateValue)),
        Math.round(toThousands(section.grandActualValue)),
        Math.round(toThousands(section.variance)),
      );
    }
    lines.push(toDate.join(","));

    const pct = [
      "%TAGE",
      ...section.metrics.flatMap((metric) => [
        "",
        formatPct(metric.actualTons, metric.estimateTons),
        "",
        formatPct(metric.actualValue, metric.estimateValue),
      ]),
    ];
    if (includeGrand) {
      pct.push(
        "",
        formatPct(section.grandActualValue, section.grandEstimateValue),
        "",
      );
    }
    lines.push(pct.join(","));
    lines.push("");
  }

  appendBudgetCsv(report.kernelPkBudgetSection, false);
  appendBudgetCsv(report.budgetSection, true);

  return lines.join("\n");
}

function downloadCsv(report: MonthlyDeliveryReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `monthly-delivery-h${report.half}-${report.financialYear}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function BudgetTable({
  section,
  showGrandTotal,
}: {
  section: MonthlyDeliveryBudgetSection;
  showGrandTotal: boolean;
}) {
  /** Shared widths so the kernel table lines up with the first 13 columns of the main table. */
  const cornerWidth = 88;
  const dataColWidth = 92;
  const gTotalColWidth = 100;
  const varianceColWidth = 110;
  const dataColCount = section.metrics.length * 4;
  const tableWidth =
    cornerWidth +
    dataColCount * dataColWidth +
    (showGrandTotal ? gTotalColWidth * 2 + varianceColWidth : 0);

  return (
    <div class="mdr-budget-block">
      <table
        class={`mdr-budget-table${showGrandTotal ? "" : " mdr-budget-table-kernel"}`}
        style={{ width: `${tableWidth}px` }}
      >
        <colgroup>
          <col style={{ width: `${cornerWidth}px` }} />
          {Array.from({ length: dataColCount }, (_, index) => (
            <col key={`data-${index}`} style={{ width: `${dataColWidth}px` }} />
          ))}
          {showGrandTotal ? (
            <>
              <col style={{ width: `${gTotalColWidth}px` }} />
              <col style={{ width: `${gTotalColWidth}px` }} />
              <col style={{ width: `${varianceColWidth}px` }} />
            </>
          ) : null}
        </colgroup>
        <thead>
          <tr>
            <th class="mdr-budget-corner" rowSpan={2}>
              {section.title}
            </th>
            {section.metrics.flatMap((metric) => [
              <th key={`${metric.id}-tons`} colSpan={2}>
                {metric.tonsLabel}
              </th>,
              <th key={`${metric.id}-value`} colSpan={2}>
                {metric.valueLabel}
              </th>,
            ])}
            {showGrandTotal ? (
              <>
                <th colSpan={2}>G.TOTAL</th>
                <th rowSpan={2}>variance</th>
              </>
            ) : null}
          </tr>
          <tr>
            {section.metrics.flatMap((metric) => [
              <th key={`${metric.id}-te`}>ESTIMATE</th>,
              <th key={`${metric.id}-ta`}>ACTUAL</th>,
              <th key={`${metric.id}-ve`}>ESTIMATE</th>,
              <th key={`${metric.id}-va`}>ACTUAL</th>,
            ])}
            {showGrandTotal ? (
              <>
                <th>ESTIMATE</th>
                <th>ACTUAL</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="mdr-budget-row-label">ESTIMATES</td>
            {section.metrics.flatMap((metric) => [
              <td key={`${metric.id}-eh`} />,
              <td key={`${metric.id}-ah`} />,
              <td key={`${metric.id}-evh`} />,
              <td key={`${metric.id}-avh`} />,
            ])}
            {showGrandTotal ? (
              <>
                <td />
                <td>(000 FCFA)</td>
                <td />
              </>
            ) : null}
          </tr>
          <tr class="mdr-budget-to-date">
            <td class="mdr-budget-row-label">TO-DATE</td>
            {section.metrics.flatMap((metric) => [
              <td key={`${metric.id}-et`} class="mdr-num">
                {formatTons(metric.estimateTons)}
              </td>,
              <td key={`${metric.id}-at`} class="mdr-num">
                {formatTons(metric.actualTons)}
              </td>,
              <td key={`${metric.id}-ev`} class="mdr-num">
                {formatValue(metric.estimateValue)}
              </td>,
              <td key={`${metric.id}-av`} class="mdr-num">
                {formatValue(metric.actualValue)}
              </td>,
            ])}
            {showGrandTotal ? (
              <>
                <td class="mdr-num">{formatValue(section.grandEstimateValue)}</td>
                <td class="mdr-num">{formatValue(section.grandActualValue)}</td>
                <td class="mdr-num mdr-budget-variance">
                  {formatVariance(section.variance)}
                </td>
              </>
            ) : null}
          </tr>
          <tr class="mdr-budget-pct">
            <td class="mdr-budget-row-label">%TAGE</td>
            {section.metrics.flatMap((metric) => [
              <td key={`${metric.id}-pte`} />,
              <td key={`${metric.id}-pta`} class="mdr-num">
                {formatPct(metric.actualTons, metric.estimateTons)}
              </td>,
              <td key={`${metric.id}-pve`} />,
              <td key={`${metric.id}-pva`} class="mdr-num">
                {formatPct(metric.actualValue, metric.estimateValue)}
              </td>,
            ])}
            {showGrandTotal ? (
              <>
                <td />
                <td class="mdr-num">
                  {formatPct(section.grandActualValue, section.grandEstimateValue)}
                </td>
                <td />
              </>
            ) : null}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function MonthlyDeliveryReportScreen({ half }: MonthlyDeliveryReportScreenProps) {
  const [report, setReport] = useState<MonthlyDeliveryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getMonthlyDelivery(half);
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
  }, [half]);

  if (loading) {
    return <p class="scr-status">Loading monthly delivery report...</p>;
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  const subColSpan = 2;

  return (
    <div class="scr-page mdr-page">
      <div class="scr-toolbar no-print">
        <button type="button" class="scr-btn" onClick={handlePrint}>
          Print
        </button>
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => {
            downloadCsv(report);
          }}
        >
          Export CSV
        </button>
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => {
            void getAuthenticatedReports().getMonthlyDelivery(half).then(setReport);
          }}
        >
          Refresh
        </button>
      </div>

      <div class="scr-document mdr-document">
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title="Monthly delivery / value"
         /*  meta={
            <>
              <p class="scr-meta-line">{report.reportTitle}</p>
              <p class="scr-as-at">
                AS at{" "}
                <span class="scr-as-at-date">{formatShortReportDate(report.asAtIso)}</span>
              </p>
              <p class="scr-generated">{formatReportDate(report.asAtIso)}</p>
            </>
          } */
        />

        {report.sections.map((section) => (
          <div key={section.sectionNo} class="scr-bottled-block mdr-section">
            <table class="scr-table mdr-table">
              <thead>
                <tr>
                  <th rowSpan={2} class="mdr-label-col">
                    {section.title}
                  </th>
                  {report.monthColumns.map((column) => (
                    <th key={column.month} colSpan={subColSpan}>
                      {column.label}
                    </th>
                  ))}
                  <th colSpan={subColSpan}>TODATE</th>
                </tr>
                <tr>
                  {report.monthColumns.flatMap((column) => [
                    <th key={`${column.month}-tons`}>TONS</th>,
                    <th key={`${column.month}-value`}>000 FCFA</th>,
                  ])}
                  <th key="todate-tons">TONS</th>
                  <th key="todate-value">000 FCFA</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => (
                  <tr
                    key={row.label}
                    class={
                      row.kind === "total" || row.kind === "subtotal"
                        ? "scr-row scr-row-total"
                        : row.kind === "avg_price"
                          ? "scr-row mdr-avg-row"
                          : row.indent
                            ? "scr-row scr-row-indent"
                            : "scr-row"
                    }
                  >
                    <td class="scr-row-label">{row.label}</td>
                    {row.kind === "avg_price" ? (
                      <>
                        {row.months.map((cell, index) => (
                          <td
                            key={`${row.label}-avg-${index}`}
                            colSpan={subColSpan}
                            class="scr-num"
                          >
                            {formatAvgPrice(cell.value)}
                          </td>
                        ))}
                        <td colSpan={subColSpan} class="scr-num scr-total-cell">
                          {formatAvgPrice(row.toDate.value)}
                        </td>
                      </>
                    ) : (
                      <>
                        {row.months.flatMap((cell, index) => [
                          <td key={`${row.label}-t-${index}`} class="scr-num">
                            {formatTons(cell.tons)}
                          </td>,
                          <td key={`${row.label}-v-${index}`} class="scr-num">
                            {formatValue(cell.value)}
                          </td>,
                        ])}
                        <td class="scr-num scr-total-cell">{formatTons(row.toDate.tons)}</td>
                        <td class="scr-num scr-total-cell">{formatValue(row.toDate.value)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}


        <BudgetTable section={report.kernelPkBudgetSection} showGrandTotal={false} />
        <BudgetTable section={report.budgetSection} showGrandTotal={true} />

        <p class="mdr-footnote">
          PKO = palm kernel oil; PKC = palm kernel cake; CPK = cracked palm kernel; UPK = uncracked
          palm kernel. Palm oil estimate = loose + bottled category budgets. Uncracked/cracked
          actuals are products in the Palm Kernel category; P. KERNEL summarises both. Values are
          shown in 000 FCFA (thousands). Budget TO-DATE is year-to-date through as-at: completed
          months at full phase weight, current month prorated by day. Actuals use invoices dated on
          or before as-at. G.TOTAL includes P. KERNEL (000 FCFA). Delivery tables above remain
          half-scoped (Jan–Jun or Jul–Dec).
        </p>
        <ReportFooter />
      </div>
    </div>
  );
}

export function MonthlyDeliveryReportH1Screen() {
  return <MonthlyDeliveryReportScreen half={1} />;
}

export function MonthlyDeliveryReportH2Screen() {
  return <MonthlyDeliveryReportScreen half={2} />;
}
