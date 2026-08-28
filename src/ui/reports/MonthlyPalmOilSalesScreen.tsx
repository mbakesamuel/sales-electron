import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  MonthlyPalmOilSalesCell,
  MonthlyPalmOilSalesMonthColumn,
  MonthlyPalmOilSalesReport,
  MonthlyPalmOilSalesRow,
} from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import "./StockCommitmentReport.css";
import "./MonthlyPalmOilSalesReport.css";

function formatTons(value: number): string {
  if (Math.abs(value) < 0.0005) {
    return "";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatValue(value: number): string {
  const thousands = value / 1000;
  if (Math.abs(thousands) < 0.5) {
    return "";
  }
  return Math.round(thousands).toLocaleString("en-US");
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

function cellCsv(cell: MonthlyPalmOilSalesCell): [string, string] {
  return [
    Math.abs(cell.tons) < 0.0005 ? "" : String(Number(cell.tons.toFixed(3))),
    Math.abs(cell.value) < 500 ? "" : String(Math.round(cell.value / 1000)),
  ];
}

function downloadCsv(report: MonthlyPalmOilSalesReport): void {
  const monthHeaders = [
    ...report.monthColumnsH1,
    ...report.monthColumnsH2,
  ].flatMap((column) => [`${column.label} TONS`, `${column.label} VALUE`]);

  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `Financial Year:,${report.financialYear}`,
    `As at:,${report.asAtIso}`,
    `Value unit:,000 FRS`,
    "",
    ["", ...monthHeaders, "TOTAL TONS", "TOTAL VALUE"].join(","),
  ];

  for (const row of report.rows) {
    if (row.kind === "section") {
      lines.push(row.label);
      continue;
    }
    const monthValues = row.months.flatMap((cell) => cellCsv(cell));
    const ytd = cellCsv(row.ytd);
    lines.push([row.label, ...monthValues, ...ytd].join(","));
  }

  const csv = lines.filter((line) => line.length > 0).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `monthly-palm-oil-sales-${report.financialYear}-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MonthBlock({
  columns,
  rows,
  showYtd,
}: {
  columns: MonthlyPalmOilSalesMonthColumn[];
  rows: MonthlyPalmOilSalesRow[];
  showYtd: boolean;
}) {
  return (
    <div class="mpos-section">
      <table class="scr-table mpos-table">
        <thead>
          <tr>
            <th class="mpos-label-col" rowSpan={2} />
            {columns.map((column) => (
              <th key={column.month} colSpan={2}>
                {column.label}
              </th>
            ))}
            {showYtd ? <th colSpan={2}>TOTAL</th> : null}
          </tr>
          <tr>
            {columns.flatMap((column) => [
              <th key={`${column.month}-tons`}>TONS</th>,
              <th key={`${column.month}-value`}>VALUE</th>,
            ])}
            {showYtd ? (
              <>
                <th>TONS</th>
                <th>VALUE</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowClass =
              row.kind === "section"
                ? "scr-row-header"
                : row.kind === "subtotal" || row.kind === "total"
                  ? "scr-row scr-row-total"
                  : "scr-row";

            if (row.kind === "section") {
              const colSpan = columns.length * 2 + (showYtd ? 2 : 0) + 1;
              return (
                <tr key={row.id} class={rowClass}>
                  <td colSpan={colSpan}>
                    <strong>{row.label}</strong>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={row.id} class={rowClass}>
                <td class="mpos-label-col">{row.label}</td>
                {columns.flatMap((column) => {
                  const cell = row.months[column.month - 1] ?? {
                    tons: 0,
                    value: 0,
                  };
                  return [
                    <td key={`${row.id}-${column.month}-tons`} class="scr-num">
                      {formatTons(cell.tons)}
                    </td>,
                    <td key={`${row.id}-${column.month}-value`} class="scr-num">
                      {formatValue(cell.value)}
                    </td>,
                  ];
                })}
                {showYtd ? (
                  <>
                    <td class="scr-num">{formatTons(row.ytd.tons)}</td>
                    <td class="scr-num">{formatValue(row.ytd.value)}</td>
                  </>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReportDocument({ report }: { report: MonthlyPalmOilSalesReport }) {
  return (
    <div class="scr-document mpos-document">
      <ReportHeader
        companyName={report.settings.companyName}
        department={report.settings.department ?? null}
        serviceName={report.settings.serviceName ?? null}
        title={report.reportTitle}
      />
      <MonthBlock
        columns={report.monthColumnsH1}
        rows={report.rows}
        showYtd={false}
      />
      <MonthBlock
        columns={report.monthColumnsH2}
        rows={report.rows}
        showYtd
      />
      <p class="mpos-footnote">Value in &apos;000 FRS · taxes excluded</p>
      <ReportCommentsSection comments={report.comments} />
      <ReportFooter
        name={report.settings.signatoryName}
        label={report.settings.signatoryTitle}
      />
    </div>
  );
}

export function MonthlyPalmOilSalesScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] = useState<MonthlyPalmOilSalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getMonthlyPalmOilSales();
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
    return <p class="scr-status">Loading monthly palm oil sales report…</p>;
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  return (
    <div class="scr-page mpos-page">
      <div class="scr-toolbar no-print">
        <button type="button" class="scr-btn" onClick={handlePrint}>
          Print
        </button>
        {windowMode ? (
          <ReportWindowSaveButton
            fileName={`monthly-palm-oil-sales-${report.financialYear}-${report.asAtIso}.pdf`}
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
          reportId="monthly-palm-oil-sales-report"
          comments={report.comments}
          onSaved={(comments) => setReport({ ...report, comments })}
        />
      </div>
      <ReportDocument report={report} />
    </div>
  );
}
