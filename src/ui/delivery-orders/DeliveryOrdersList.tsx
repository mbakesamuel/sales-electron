import { useEffect, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import type { DeliveryOrdersListFilters, DeliveryOrdersListResult } from "./types.ts";
import "../sales/sales.css";

interface DeliveryOrdersListProps {
  onOpenOrder: (deliveryOrderNo: string) => void;
  onOpenScreen?: () => void;
}

export function DeliveryOrdersList({ onOpenOrder, onOpenScreen }: DeliveryOrdersListProps) {
  const [filters, setFilters] = useState<DeliveryOrdersListFilters>({
    q: "",
    period: "month",
  });
  const [draftQ, setDraftQ] = useState("");
  const [result, setResult] = useState<DeliveryOrdersListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getElectronApi().deliveryOrders.listOrders(filters);
        if (!cancelled) {
          setResult(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load delivery orders.",
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
      <div class="sales-panel-header">
        <div>
          <h3>Delivery orders</h3>
          <p class="sales-muted">
            Filter by DO number, or view all within the current month or year.
          </p>
        </div>
        {onOpenScreen ? (
          <button type="button" class="sales-btn-secondary" onClick={onOpenScreen}>
            Open DO screen
          </button>
        ) : null}
      </div>

      <form class="sales-panel sales-filters" onSubmit={applyFilters}>
        <label class="sales-field">
          <span>DO number</span>
          <input
            type="search"
            value={draftQ}
            placeholder="e.g. DO-2026-000001"
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
                  .value as DeliveryOrdersListFilters["period"],
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

      <div class="sales-panel sales-table-wrap">
        {isLoading ? (
          <p class="sales-muted">Loading…</p>
        ) : (
          <table class="sales-table">
            <thead>
              <tr>
                <th>DO no.</th>
                <th>Date</th>
                <th>Sales point</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Status</th>
                <th class="sales-num">Qty</th>
                <th class="sales-num">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result && result.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} class="sales-empty">
                    No delivery orders match these filters.
                  </td>
                </tr>
              ) : null}
              {result?.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.deliveryOrderNo}</td>
                  <td>{row.dateIssuedIso}</td>
                  <td>{row.salesPointName}</td>
                  <td>{row.customerName}</td>
                  <td>{row.productSummary}</td>
                  <td>
                    <span class={`sales-status sales-status-${row.status.toLowerCase()}`}>
                      {row.status}
                    </span>
                  </td>
                  <td class="sales-num">{row.totalQtyLabel}</td>
                  <td class="sales-num">{row.totalAmountXaf}</td>
                  <td class="sales-row-actions">
                    <button
                      type="button"
                      class="sales-btn-secondary sales-btn-small"
                      onClick={() => onOpenOrder(row.deliveryOrderNo)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {result && result.rows.length > 0 ? (
              <tfoot>
                <tr>
                  <td colSpan={6}>
                    Totals ({result.periodLabel}) · {result.totals.count} DOs
                  </td>
                  <td class="sales-num">{result.totals.totalQtyLabel}</td>
                  <td class="sales-num">{result.totals.totalAmountXaf}</td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        )}
      </div>
    </div>
  );
}
