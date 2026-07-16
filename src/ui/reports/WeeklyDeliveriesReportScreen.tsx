import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedReports } from "../auth/reports.ts";
import type {
  WeeklyDeliveriesBottledSection,
  WeeklyDeliveriesLooseSection,
  WeeklyDeliveriesReport,
} from "../../shared/reports.types.ts";
import { ReportFooter } from "./ReportFooter.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import "./StockCommitmentReport.css";

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
  const rounded = Math.round(value);
  return rounded.toLocaleString("en-US");
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

function buildCsv(report: WeeklyDeliveriesReport): string {
  const lines: string[] = [
    `Company:,${report.settings.companyName}`,
    report.settings.department ? `Department:,${report.settings.department}` : "",
    `Week:,${formatReportDate(report.weekFromIso)} - ${formatReportDate(report.weekToIso)}`,
    "",
    report.looseSection.title,
    ["", ...report.looseSection.salesPointNames, "TOTAL"].join(","),
  ];

  for (const row of report.looseSection.rows) {
    lines.push([row.label, ...row.quantities, row.rowTotal].join(","));
  }

  lines.push("", report.bottledSection.title);
  lines.push(["", ...report.bottledSection.columns.map((column) => column.label), "TOTAL"].join(","));
  lines.push(["", ...report.bottledSection.unitCounts, report.bottledSection.totalUnits].join(","));
  lines.push(["LITRES", ...report.bottledSection.litres, ""].join(","));
  lines.push(["KGS", ...report.bottledSection.kgs, report.bottledSection.totalKgs].join(","));
  lines.push(`TOTAL DELIVERIES,,,${report.bottledSection.totalUnits}`);

  if (report.miscRows.length > 0) {
    lines.push("");
    for (const row of report.miscRows) {
      lines.push(`${row.label},${row.quantityKg}`);
    }
  }

  return lines.join("\n");
}

function downloadCsv(report: WeeklyDeliveriesReport): void {
  const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `weekly-deliveries-${report.weekToIso}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function LooseSection({ section }: { section: WeeklyDeliveriesLooseSection }) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table">
        <thead>
          <tr>
            <th colSpan={section.salesPointNames.length + 2} class="scr-section-title">
              {section.title}
            </th>
          </tr>
          <tr>
            <th />
            {section.salesPointNames.map((name) => (
              <th key={name}>{name}</th>
            ))}
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr
              key={row.label}
              class={row.kind === "total" ? "scr-row scr-row-total" : "scr-row"}
            >
              <td class="scr-row-label">{row.label}</td>
              {row.quantities.map((qty, index) => (
                <td key={`${row.label}-${index}`} class="scr-num">
                  {formatQty(qty)}
                </td>
              ))}
              <td class="scr-num scr-total-cell">{formatQty(row.rowTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BottledSection({ section }: { section: WeeklyDeliveriesBottledSection }) {
  return (
    <div class="scr-bottled-block">
      <table class="scr-table scr-bottled-table">
        <thead>
          <tr>
            <th colSpan={section.columns.length + 2} class="scr-section-title">
              {section.title}
            </th>
          </tr>
          <tr>
            <th />
            {section.columns.map((column) => (
              <th key={column.id}>{column.label}</th>
            ))}
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td />
            {section.unitCounts.map((count, index) => (
              <td key={`units-${index}`} class="scr-num">
                {formatQty(count)}
              </td>
            ))}
            <td class="scr-num scr-total-cell">{formatQty(section.totalUnits)}</td>
          </tr>
          <tr>
            <td class="scr-row-label">LITRES</td>
            {section.litres.map((litre, index) => (
              <td key={`litres-${index}`} class="scr-num">
                {formatQty(litre)}
              </td>
            ))}
            <td />
          </tr>
          <tr>
            <td class="scr-row-label">KGS</td>
            {section.kgs.map((kg, index) => (
              <td key={`kgs-${index}`} class="scr-num">
                {formatQty(kg)}
              </td>
            ))}
            <td class="scr-num scr-total-cell">{formatQty(section.totalKgs)}</td>
          </tr>
          <tr class="scr-row-total">
            <td class="scr-row-label">TOTAL DELIVERIES</td>
            <td colSpan={section.columns.length} />
            <td class="scr-num scr-total-cell">{formatQty(section.totalUnits)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function WeeklyDeliveriesReportScreen() {
  const [report, setReport] = useState<WeeklyDeliveriesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAuthenticatedReports().getWeeklyDeliveries();
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
  }, []);

  if (loading) {
    return <p class="scr-status">Loading weekly deliveries report...</p>;
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
        <button type="button" class="scr-btn scr-btn-secondary" onClick={() => downloadCsv(report)}>
          Export CSV
        </button>
        <button
          type="button"
          class="scr-btn scr-btn-secondary"
          onClick={() => {
            void getAuthenticatedReports().getWeeklyDeliveries().then(setReport);
          }}
        >
          Refresh
        </button>
      </div>

      <div class="scr-document">
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department ?? null}
          serviceName={report.settings.serviceName ?? null}
          title="Deliveries of the week (KGs)"
          meta={
            <>
              <p class="scr-meta-line">
                <span class="scr-meta-label">WEEK:</span>{" "}
                {formatReportDate(report.weekFromIso)} – {formatReportDate(report.weekToIso)}
              </p>
              <p class="scr-as-at">
                AS at{" "}
                <span class="scr-as-at-date">{formatShortReportDate(report.asAtIso)}</span>
              </p>
              <p class="scr-generated">{formatReportDate(report.asAtIso)}</p>
            </>
          }
        />

        <LooseSection section={report.looseSection} />
        <BottledSection section={report.bottledSection} />

        {report.miscRows.length > 0 ? (
          <div class="scr-bottled-block">
            <table class="scr-table">
              <tbody>
                {report.miscRows.map((row) => (
                  <tr key={row.label} class="scr-row">
                    <td class="scr-row-label">{row.label}</td>
                    <td class="scr-num">{formatQty(row.quantityKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <ReportFooter />
      </div>
    </div>
  );
}
