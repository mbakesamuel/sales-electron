import { useEffect, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import { getElectronApi } from "../auth/client.ts";
import type {
  DeliveryOrdersListFilters,
  DeliveryOrdersListResult,
  DeliveryOrdersSalesPointOption,
} from "./types.ts";
import "../sales/sales.css";

interface DeliveryOrdersListProps {
  onOpenOrder: (deliveryOrderNo: string) => void;
  onOpenScreen?: () => void;
}

const PAGE_SIZE = 15;

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function DeliveryOrdersList({ onOpenOrder, onOpenScreen }: DeliveryOrdersListProps) {
  const [filters, setFilters] = useState<DeliveryOrdersListFilters>({
    q: "",
    period: "month",
    salesPointId: null,
  });
  const [draftQ, setDraftQ] = useState("");
  const [salesPoints, setSalesPoints] = useState<DeliveryOrdersSalesPointOption[]>([]);
  const [result, setResult] = useState<DeliveryOrdersListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const options = await getElectronApi().deliveryOrders.getFormOptions();
        if (!cancelled) {
          setSalesPoints(options.salesPoints);
        }
      } catch {
        // Options are best-effort; list can still load without them.
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

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

  const rows = result?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const pageStart =
    rows.length === 0 ? 0 : Math.min((currentPage - 1) * PAGE_SIZE + 1, rows.length);
  const pageEnd = Math.min(currentPage * PAGE_SIZE, rows.length);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
            Filter by DO number, collection point, or view documents in the open posting month or year.
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
            placeholder="e.g. 12345"
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
            <option value="month">Open month</option>
            <option value="year">Open year</option>
            <option value="all">All time</option>
          </select>
        </label>

        <label class="sales-field">
          <span>Collection point</span>
          <select
            value={filters.salesPointId == null ? "" : String(filters.salesPointId)}
            onChange={(event) => {
              const value = (event.currentTarget as HTMLSelectElement).value;
              setFilters((current) => ({
                ...current,
                salesPointId: value ? Number.parseInt(value, 10) : null,
              }));
            }}
          >
            <option value="">All collection points</option>
            {salesPoints.map((point) => (
              <option key={point.id} value={String(point.id)}>
                {point.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" class="sales-btn-primary">
          Apply
        </button>
      </form>

      {error ? <p class="sales-error">{error}</p> : null}

      <div class="sales-panel sales-table-wrap">
        <table class="sales-table sales-list-table">
          <thead>
            <tr>
              <th>DO no.</th>
              <th>Date</th>
              <th>Collection point</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Status</th>
              <th class="sales-num">Qty</th>
              <th class="sales-num">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} class="sales-empty-cell">
                  Loading delivery orders…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} class="sales-empty-cell">
                  No delivery orders match these filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id}>
                  <td class="sales-strong">{row.deliveryOrderNo}</td>
                  <td>{formatDisplayDate(row.dateIssuedIso)}</td>
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
                  <td class="sales-actions-cell">
                    <button
                      type="button"
                      class="sales-link-btn"
                      onClick={() => onOpenOrder(row.deliveryOrderNo)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {result && !isLoading ? (
        <div class="sales-list-footer">
          <div class="sales-list-footer-totals">
            {rows.length > 0 ? (
              <>
                <span>
                  Totals ({result.periodLabel}) · {result.totals.count} DOs
                </span>
                <span class="sales-num">{result.totals.totalQtyLabel}</span>
                <span class="sales-num">{result.totals.totalAmountXaf}</span>
              </>
            ) : (
              <span class="sales-muted">No delivery orders in this filter.</span>
            )}
          </div>
          <div class="sales-list-pagination">
            <span>
              Showing {pageStart}–{pageEnd} of {rows.length}
            </span>
            <div class="sales-list-pagination-pages">
              <button
                type="button"
                class="sales-list-pagination-btn"
                disabled={currentPage <= 1}
                aria-label="Previous page"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <IconChevronLeft />
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                class="sales-list-pagination-btn"
                disabled={currentPage >= totalPages}
                aria-label="Next page"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                <IconChevronRight />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
