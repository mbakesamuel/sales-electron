import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  BottledPalmOilSalesReturnReport,
  BottledPalmOilSalesReturnRow,
  BottledPalmOilSalesReturnRowKind,
} from "../../shared/reports.types.ts";
import { ReportCommentsEditor } from "./ReportCommentsEditor.tsx";
import { ReportCommentsSection } from "./ReportCommentsSection.tsx";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { ReportWindowSaveButton } from "./ReportWindowSaveButton.tsx";
import "./StockCommitmentReport.css";
import "./BottledPalmOilSalesReturnReport.css";

const AMOUNT_KINDS = new Set<BottledPalmOilSalesReturnRowKind>([
  "cashSales",
  "publicRelation",
  "totalIssues",
]);

const TOTAL_KG_KINDS = new Set<BottledPalmOilSalesReturnRowKind>([
  "bf",
  "reception",
  "totalStock",
  "cashSales",
  "publicRelation",
  "totalIssues",
  "balance",
]);

const PACK_QTY_AS_KG_KINDS = new Set<BottledPalmOilSalesReturnRowKind>([
  "issuesKg",
  "balanceKg",
]);

const EMPHASIS_KINDS = new Set<BottledPalmOilSalesReturnRowKind>([
  "totalStock",
  "totalIssues",
  "balance",
]);

function formatQty(value: number): string {
  if (Math.abs(value) < 0.0005) {
    return "—";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatAmount(value: number): string {
  if (Math.abs(value) < 0.5) {
    return "—";
  }
  return Math.round(value).toLocaleString("en-US");
}

function formatKg(value: number): string {
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

function csvQty(value: number): string {
  return Math.abs(value) < 0.0005 ? "" : String(Number(value.toFixed(3)));
}

function csvKg(value: number): string {
  return Math.abs(value) < 0.5 ? "" : String(Math.round(value));
}

function csvAmount(value: number): string {
  return Math.abs(value) < 0.5 ? "" : String(Math.round(value));
}

function downloadCsv(report: BottledPalmOilSalesReturnReport): void {
  const packHeaders = report.packColumns.flatMap((column) => [
    `${column.label} QUANTITY`,
    `${column.label} AMOUNT WITHOUT T.`,
  ]);

  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `Financial Year:,${report.financialYear}`,
    `Month:,${report.monthName}`,
    `As at:,${report.asAtIso}`,
    "",
    ["", ...packHeaders, "TOTAL IN KGS", "GRAND TOTAL IN FCFA"].join(","),
  ];

  for (const row of report.rows) {
    if (row.kind === "section") {
      lines.push(row.label);
      continue;
    }

    const showAmount = AMOUNT_KINDS.has(row.kind);
    const showTotalKg = TOTAL_KG_KINDS.has(row.kind);
    const packQtyAsKg = PACK_QTY_AS_KG_KINDS.has(row.kind);
    const packValues = row.packs.flatMap((cell) => [
      packQtyAsKg ? csvKg(cell.qty) : csvQty(cell.qty),
      showAmount ? csvAmount(cell.amount) : "",
    ]);
    lines.push(
      [
        row.label,
        ...packValues,
        showTotalKg ? csvKg(row.totalKg) : "",
        showAmount ? csvAmount(row.grandTotalFcfa) : "",
      ].join(","),
    );
  }

  const csv = lines.filter((line) => line.length > 0).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bottled-palm-oil-sales-return-${report.financialYear}-${report.asAtIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function rowClassName(row: BottledPalmOilSalesReturnRow): string | undefined {
  if (row.kind === "section") {
    return "scr-row-header";
  }
  if (EMPHASIS_KINDS.has(row.kind)) {
    return "scr-row scr-row-total";
  }
  return "scr-row";
}

function ReportDocument({ report }: { report: BottledPalmOilSalesReturnReport }) {
  const colSpan = report.packColumns.length * 2 + 3;

  return (
    <div class="scr-document bposr-document">
      <ReportHeader
        companyName={report.settings.companyName}
        department={report.settings.department ?? null}
        serviceName={report.settings.serviceName ?? null}
        title={report.reportTitle}
      />
      <div class="bposr-section">
        <table class="scr-table bposr-table">
          <thead>
            <tr>
              <th class="bposr-label-col" rowSpan={2} />
              {report.packColumns.map((column) => (
                <th key={column.id} colSpan={2}>
                  {column.label}
                </th>
              ))}
              <th rowSpan={2}>TOTAL IN KGS</th>
              <th rowSpan={2}>GRAND TOTAL IN FCFA</th>
            </tr>
            <tr>
              {report.packColumns.flatMap((column) => [
                <th key={`${column.id}-qty`}>QUANTITY</th>,
                <th key={`${column.id}-amount`}>AMOUNT WITHOUT T.</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => {
              if (row.kind === "section") {
                return (
                  <tr key={row.id} class={rowClassName(row)}>
                    <td colSpan={colSpan}>
                      <strong>{row.label}</strong>
                    </td>
                  </tr>
                );
              }

              const showAmount = AMOUNT_KINDS.has(row.kind);
              const showTotalKg = TOTAL_KG_KINDS.has(row.kind);
              const packQtyAsKg = PACK_QTY_AS_KG_KINDS.has(row.kind);

              return (
                <tr key={row.id} class={rowClassName(row)}>
                  <td class="bposr-label-col">{row.label}</td>
                  {row.packs.flatMap((cell, index) => {
                    const packId = report.packColumns[index]?.id ?? index;
                    return [
                      <td key={`${row.id}-${packId}-qty`} class="scr-num">
                        {packQtyAsKg ? formatKg(cell.qty) : formatQty(cell.qty)}
                      </td>,
                      <td key={`${row.id}-${packId}-amount`} class="scr-num">
                        {showAmount ? formatAmount(cell.amount) : "—"}
                      </td>,
                    ];
                  })}
                  <td class="scr-num">
                    {showTotalKg ? formatKg(row.totalKg) : "—"}
                  </td>
                  <td class="scr-num">
                    {showAmount ? formatAmount(row.grandTotalFcfa) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="bposr-footnote">Value without taxes · amounts in FCFA</p>
      <ReportCommentsSection comments={report.comments} />
      <ReportFooter
        name={report.settings.signatoryName}
        label={report.settings.signatoryTitle}
      />
    </div>
  );
}

export function BottledPalmOilSalesReturnScreen({
  windowMode = false,
}: {
  windowMode?: boolean;
}) {
  const [report, setReport] = useState<BottledPalmOilSalesReturnReport | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data =
          await getAuthenticatedReports().getBottledPalmOilSalesReturn();
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
      <p class="scr-status">Loading bottled palm oil sales return…</p>
    );
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data available.</p>;
  }

  return (
    <div class="scr-page bposr-page">
      <div class="scr-toolbar no-print">
        <button type="button" class="scr-btn" onClick={handlePrint}>
          Print
        </button>
        {windowMode ? (
          <ReportWindowSaveButton
            fileName={`bottled-palm-oil-sales-return-${report.financialYear}-${report.asAtIso}.pdf`}
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
          reportId="bottled-palm-oil-sales-return-report"
          initialText={report.comments}
          onSaved={(comments) => setReport({ ...report, comments })}
        />
      </div>
      <ReportDocument report={report} />
    </div>
  );
}
