import { useEffect, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { SalePrintView } from "./SalePrintView.tsx";
import type { SalesListFilters, SalesListResult } from "./types.ts";

interface SalesListProps {
  onOpenInvoice: (invoiceNo: string) => void;
  onOpenPos?: () => void;
}

export function SalesList({ onOpenInvoice, onOpenPos }: SalesListProps) {
  const [filters, setFilters] = useState<SalesListFilters>({
    q: "",
    period: "month",
  });
  const [draftQ, setDraftQ] = useState("");
  const [result, setResult] = useState<SalesListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printSaleId, setPrintSaleId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getElectronApi().sales.listSales(filters);
        if (!cancelled) {
          setResult(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load sales list.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  function applyFilters(event: Event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, q: draftQ.trim() }));
  }

  return (
    <div class="sales-list">
      {printSaleId ? (
        <SalePrintView saleId={printSaleId} onClose={() => setPrintSaleId(null)} />
      ) : null}

      <div class="sales-panel-header">
        <div>
          <h3>Sales invoices</h3>
          <p class="sales-muted">
            Filter by invoice number, or view all within the current month or year.
          </p>
        </div>
        {onOpenPos ? (
          <button type="button" class="sales-btn-secondary" onClick={onOpenPos}>
            Open sales screen
          </button>
        ) : null}
      </div>

      <form class="sales-panel sales-filters" onSubmit={applyFilters}>
        <label class="sales-field">
          <span>Invoice number</span>
          <input
            type="search"
            value={draftQ}
            placeholder="e.g. INV-2026-000001"
            onInput={(event) =>
              setDraftQ((event.currentTarget as HTMLInputElement).value)
            }
          />
        </label>

        <label class="sales-field">
          <span>Period</span>
          <select
            value={filters.period ?? "month"}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                period: (event.currentTarget as HTMLSelectElement)
                  .value as SalesListFilters["period"],
              }))
            }
          >
            <option value="month">Current month</option>
            <option value="year">Current year</option>
            <option value="all">All time</option>
          </select>
        </label>

        <button type="submit" class="sales-btn-primary">
          Apply
        </button>

        {result ? (
          <span class="sales-muted sales-filter-label">{result.periodLabel}</span>
        ) : null}
      </form>

      {error ? <p class="sales-error">{error}</p> : null}

      <div class="sales-table-wrap sales-panel">
        <table class="sales-table sales-list-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Sales point</th>
              <th>DO No</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Status</th>
              <th class="sales-num">Qty</th>
              <th class="sales-num">Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} class="sales-empty-cell">
                  Loading invoices…
                </td>
              </tr>
            ) : result && result.rows.length === 0 ? (
              <tr>
                <td colSpan={10} class="sales-empty-cell">
                  No sales invoices match these filters.
                </td>
              </tr>
            ) : (
              result?.rows.map((row) => (
                <tr key={row.id}>
                  <td class="sales-strong">{row.invoiceNo}</td>
                  <td>{row.soldAtIso}</td>
                  <td>{row.salesPointName}</td>
                  <td>{row.deliveryOrderNo ?? ""}</td>
                  <td>{row.customerName}</td>
                  <td>{row.productSummary}</td>
                  <td>
                    <span class={`sales-status sales-status-${row.status.toLowerCase()}`}>
                      {row.status}
                    </span>
                  </td>
                  <td class="sales-num">{row.totalQtyLabel}</td>
                  <td class="sales-num">{row.totalAmountXaf}</td>
                  <td class="sales-actions-cell">
                    <button
                      type="button"
                      class="sales-link-btn"
                      onClick={() => onOpenInvoice(row.invoiceNo)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      class="sales-link-btn"
                      onClick={() => setPrintSaleId(row.id)}
                    >
                      Print
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {result && result.rows.length > 0 ? (
            <tfoot>
              <tr>
                <td colSpan={7}>
                  Totals ({result.periodLabel}) · {result.totals.count} invoices
                </td>
                <td class="sales-num">{result.totals.totalQtyLabel}</td>
                <td class="sales-num">{result.totals.totalAmountXaf}</td>
                <td />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
