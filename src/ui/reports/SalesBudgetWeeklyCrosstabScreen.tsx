import { useEffect, useMemo, useState } from "preact/hooks";
import { DocumentPreview } from "../print/DocumentPreview.tsx";
import { getAuthenticatedReports } from "../auth/reports.ts";
import { formatDisplayDateTime } from "../../shared/formatDisplayDate.ts";
import type { SalesBudgetWeeklyCrosstabReport } from "../../shared/reports.types.ts";
import {
  CAL_MONTHS,
  formatPhasedQtyKgDisplay,
  monthName,
  salesBudgetCrosstabCellKey,
} from "../../shared/salesBudgetPhase.ts";
import { ReportFilterGate } from "./ReportFilterGate.tsx";
import { ReportDocumentShell } from "./ReportDocumentShell.tsx";
import { ReportHeader } from "./ReportHeader.tsx";
import { salesBudgetWeeklyCrosstabEmptyMessage } from "./reportEmpty.ts";
import "./StockCommitmentReport.css";
import "./SalesBudgetCrosstab.css";

interface SalesBudgetWeeklyCrosstabScreenProps {
  onNavigate?: (routeId: string) => void;
  windowMode?: boolean;
}

export function buildQtyMap(report: SalesBudgetWeeklyCrosstabReport): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of report.qtyByCell) {
    map.set(entry.key, entry.qtyKg);
  }
  return map;
}

function formatGeneratedAt(iso: string): string {
  return formatDisplayDateTime(iso);
}

export function SalesBudgetWeeklyCrosstabDocument({
  report,
  qtyMap,
}: {
  report: SalesBudgetWeeklyCrosstabReport;
  qtyMap: Map<string, number>;
}) {
  const emptyMessage = salesBudgetWeeklyCrosstabEmptyMessage(report);

  return (
    <DocumentPreview
        title="Sales budget weekly"
        fileName={`sales-budget-weekly-${report.reportYear}.pdf`}
        page="landscape-tight"
        bodyClass="mdr-print-landscape"
        sourceKey={report}
      >
      <ReportDocumentShell
      className="scr-document wpp-pack-page wpp-pack-crosstab"
      isEmpty={emptyMessage !== null}
      emptyMessage={emptyMessage ?? ""}
      comments={report.comments}
      signatoryName={report.settings.signatoryName}
      signatoryTitle={report.settings.signatoryTitle}
      header={
        <ReportHeader
          companyName={report.settings.companyName}
          department={report.settings.department}
          serviceName={report.settings.serviceName}
          title="Sales budget — weekly phasing crosstab (kg)"
        />
      }
    >
      <div>
        <p class="sbc-intro">
          Calendar year <strong>{report.reportYear}</strong>. Rows are ISO weeks; columns are
          budget group × calendar month. Each cell is phased budget kg for days in that week within
          that month (from Sales budgets).
        </p>
        <p class="sbc-intro-meta">Generated {formatGeneratedAt(report.generatedAtIso)}</p>
      </div>

      <div class="sbc-table-wrap">
        <table class="sbc-table sbc-table-weekly">
            <thead>
              <tr>
                <th rowSpan={2} class="sbc-sticky-col sbc-week-col">
                  ISO week
                </th>
                {report.categoriesInReport.map((cat) => (
                  <th
                    key={cat.productCatId}
                    colSpan={12}
                    class="sbc-product-group"
                  >
                    {cat.label}
                  </th>
                ))}
                <th rowSpan={2} class="sbc-num sbc-total-col">
                  Row total
                </th>
              </tr>
              <tr>
                {report.categoriesInReport.map((cat) =>
                  CAL_MONTHS.map((month) => (
                    <th
                      key={`${cat.productCatId}-${month}`}
                      class="sbc-num sbc-month-head"
                      title={monthName(month)}
                    >
                      {monthName(month).slice(0, 3)}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {report.sortedWeeks.map((week, rowIndex) => {
                const rowTotal = report.rowTotals[rowIndex] ?? 0;
                return (
                  <tr key={week.label}>
                    <td class="sbc-sticky-col sbc-week-col">{week.label}</td>
                    {report.cols.map((col) => {
                      const qty =
                        qtyMap.get(
                          salesBudgetCrosstabCellKey(
                            week.label,
                            col.productCatId,
                            col.month,
                          ),
                        ) ?? 0;
                      return (
                        <td
                          key={`${col.productCatId}-${col.month}`}
                          class={`sbc-num sbc-month-head${qty === 0 ? " sbc-zero" : ""}`}
                        >
                          {qty === 0 ? "—" : formatPhasedQtyKgDisplay(qty)}
                        </td>
                      );
                    })}
                    <td class={`sbc-num sbc-total-col${rowTotal === 0 ? " sbc-zero" : ""}`}>
                      {rowTotal === 0 ? "—" : formatPhasedQtyKgDisplay(rowTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr class="sbc-foot">
                <td class="sbc-sticky-col sbc-week-col">Column totals (kg)</td>
                {report.colTotals.map((value, index) => (
                  <td
                    key={index}
                    class={`sbc-num sbc-month-head${value === 0 ? " sbc-zero" : ""}`}
                  >
                    {value === 0 ? "—" : formatPhasedQtyKgDisplay(value)}
                  </td>
                ))}
                <td class={`sbc-num sbc-total-col${report.grandTotal === 0 ? " sbc-zero" : ""}`}>
                  {report.grandTotal === 0 ? "—" : formatPhasedQtyKgDisplay(report.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
    </ReportDocumentShell>
      </DocumentPreview>
  );
}

export function SalesBudgetWeeklyCrosstabScreen({
  onNavigate,
  windowMode = false,
}: SalesBudgetWeeklyCrosstabScreenProps) {
  void windowMode;
  const [report, setReport] = useState<SalesBudgetWeeklyCrosstabReport | null>(null);
  const [reportYear, setReportYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAuthenticatedReports()
      .getSalesBudgetWeeklyCrosstab(reportYear ?? undefined)
      .then((data) => {
        if (!cancelled) {
          setReport(data);
          setReportYear(data.reportYear);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load report.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reportYear]);

  const qtyMap = useMemo(() => (report ? buildQtyMap(report) : new Map()), [report]);

  if (loading && !report) {
    return <p class="scr-status">Loading sales budget weekly crosstab…</p>;
  }

  if (error) {
    return <p class="scr-status scr-status-error">{error}</p>;
  }

  if (!report) {
    return <p class="scr-status">No report data.</p>;
  }

  return (
    <ReportFilterGate
      ready
      reportId="sales-budget-weekly-crosstab"
      className="scr-page sbc-root"
      filters={
      <div class="sbc-toolbar no-print">
        <div class="sbc-year-picker">
          {report.yearChoices.map((year) => (
            <button
              key={year}
              type="button"
              class={`sbc-year-btn${year === report.reportYear ? " is-active" : ""}`}
              onClick={() => setReportYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
      }
    >
      <DocumentPreview
        title="Sales budget weekly"
        fileName={`sales-budget-weekly-${report.reportYear}.pdf`}
        page="landscape-tight"
        bodyClass="mdr-print-landscape"
        sourceKey={report}
      >
      <ReportDocumentShell
        className="scr-document wpp-pack-page wpp-pack-crosstab"
        isEmpty={salesBudgetWeeklyCrosstabEmptyMessage(report) !== null}
        emptyMessage={salesBudgetWeeklyCrosstabEmptyMessage(report) ?? ""}
        comments={report.comments}
        signatoryName={report.settings.signatoryName}
        signatoryTitle={report.settings.signatoryTitle}
        header={
          <ReportHeader
            companyName={report.settings.companyName}
            department={report.settings.department}
            serviceName={report.settings.serviceName}
            title="Sales budget — weekly phasing crosstab (kg)"
          />
        }
      >
        <div>
          <p class="sbc-intro">
            Calendar year <strong>{report.reportYear}</strong>. Rows are ISO weeks; columns are
            budget group × calendar month. Each cell is phased budget kg for days in that week within
            that month (from Sales budgets).{" "}
            {onNavigate ? (
              <>
                <button
                  type="button"
                  class="sbc-link-btn"
                  onClick={() => onNavigate("sales-budget-monthly-crosstab")}
                >
                  Monthly phasing crosstab
                </button>
                {" · "}
                <button
                  type="button"
                  class="sbc-link-btn"
                  onClick={() => onNavigate("sales-budget-weekly-revenue-crosstab")}
                >
                  Weekly revenue phasing crosstab
                </button>
              </>
            ) : (
              "See also the monthly phasing and weekly revenue phasing crosstabs."
            )}
            .
          </p>
          <p class="sbc-intro-meta">Generated {formatGeneratedAt(report.generatedAtIso)}</p>
        </div>

        <div class="sbc-table-wrap">
          <table class="sbc-table sbc-table-weekly">
              <thead>
                <tr>
                  <th rowSpan={2} class="sbc-sticky-col sbc-week-col">
                    ISO week
                  </th>
                  {report.categoriesInReport.map((cat) => (
                    <th
                      key={cat.productCatId}
                      colSpan={12}
                      class="sbc-product-group"
                    >
                      {cat.label}
                    </th>
                  ))}
                  <th rowSpan={2} class="sbc-num sbc-total-col">
                    Row total
                  </th>
                </tr>
                <tr>
                  {report.categoriesInReport.map((cat) =>
                    CAL_MONTHS.map((month) => (
                      <th
                        key={`${cat.productCatId}-${month}`}
                        class="sbc-num sbc-month-head"
                        title={monthName(month)}
                      >
                        {monthName(month).slice(0, 3)}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {report.sortedWeeks.map((week, rowIndex) => {
                  const rowTotal = report.rowTotals[rowIndex] ?? 0;
                  return (
                    <tr key={week.label}>
                      <td class="sbc-sticky-col sbc-week-col">{week.label}</td>
                      {report.cols.map((col) => {
                        const qty =
                          qtyMap.get(
                            salesBudgetCrosstabCellKey(
                              week.label,
                              col.productCatId,
                              col.month,
                            ),
                          ) ?? 0;
                        return (
                          <td
                            key={`${col.productCatId}-${col.month}`}
                            class={`sbc-num sbc-month-head${qty === 0 ? " sbc-zero" : ""}`}
                          >
                            {qty === 0 ? "—" : formatPhasedQtyKgDisplay(qty)}
                          </td>
                        );
                      })}
                      <td class={`sbc-num sbc-total-col${rowTotal === 0 ? " sbc-zero" : ""}`}>
                        {rowTotal === 0 ? "—" : formatPhasedQtyKgDisplay(rowTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr class="sbc-foot">
                  <td class="sbc-sticky-col sbc-week-col">Column totals (kg)</td>
                  {report.colTotals.map((value, index) => (
                    <td
                      key={index}
                      class={`sbc-num sbc-month-head${value === 0 ? " sbc-zero" : ""}`}
                    >
                      {value === 0 ? "—" : formatPhasedQtyKgDisplay(value)}
                    </td>
                  ))}
                  <td class={`sbc-num sbc-total-col${report.grandTotal === 0 ? " sbc-zero" : ""}`}>
                    {report.grandTotal === 0 ? "—" : formatPhasedQtyKgDisplay(report.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
      </ReportDocumentShell>
      </DocumentPreview>
    </ReportFilterGate>
  );
}
