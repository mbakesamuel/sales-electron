import { useEffect, useMemo, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { SaleProductMode } from "../../shared/sales.types.ts";
import type { SalesModuleVariant } from "../../shared/salesModule.ts";
import { getElectronApi } from "../auth/client.ts";
import { SalePrintView } from "./SalePrintView.tsx";
import type { SalesListFilters, SalesListResult } from "./types.ts";

interface SalesListProps {
  variant?: SalesModuleVariant;
  listTitle?: string;
  productMode: SaleProductMode;
  onOpenInvoice: (invoiceNo: string) => void;
  onOpenPos?: () => void;
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

export function SalesList({
  variant = "loose",
  listTitle,
  productMode,
  onOpenInvoice,
  onOpenPos,
}: SalesListProps) {
  const filters = useMemo<SalesListFilters>(
    () => ({
      q: "",
      period: "month",
      productMode,
    }),
    [productMode],
  );
  const [appliedFilters, setAppliedFilters] = useState<SalesListFilters>(filters);
  const [draftQ, setDraftQ] = useState("");
  const [result, setResult] = useState<SalesListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printSaleId, setPrintSaleId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const isBottled = variant === "bottled";
  const title =
    listTitle ?? (isBottled ? "Bottle Oil invoices" : "Sales invoices");
  const qtyHeader = isBottled ? "Qty (units)" : "Qty (kg)";
  const colCount = isBottled ? 9 : 10;

  useEffect(() => {
    setAppliedFilters((current) => ({
      ...current,
      productMode,
    }));
  }, [productMode]);

  useEffect(() => {
    setPage(1);
  }, [appliedFilters]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getElectronApi().sales.listSales(appliedFilters);
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
  }, [appliedFilters]);

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
    setAppliedFilters((current) => ({ ...current, q: draftQ.trim() }));
  }

  return (
    <div class="sales-list">
      {printSaleId ? (
        <SalePrintView saleId={printSaleId} onClose={() => setPrintSaleId(null)} />
      ) : null}

      <div class="sales-panel-header">
        <div>
          <h3>{title}</h3>
          <p class="sales-muted">
            Filter by invoice number, or view documents in the open posting month or year.
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
            placeholder="e.g. 12345"
            onInput={(event) =>
              setDraftQ((event.currentTarget as HTMLInputElement).value)
            }
          />
        </label>

        <label class="sales-field">
          <span>Period</span>
          <select
            value={appliedFilters.period ?? "month"}
            onChange={(event) =>
              setAppliedFilters((current) => ({
                ...current,
                period: (event.currentTarget as HTMLSelectElement)
                  .value as SalesListFilters["period"],
              }))
            }
          >
            <option value="month">Open month</option>
            <option value="year">Open year</option>
            <option value="all">All time</option>
          </select>
        </label>

        <button type="submit" class="sales-btn-primary">
          Apply
        </button>
      </form>

      {error ? <p class="sales-error">{error}</p> : null}

      <div class="sales-table-wrap sales-panel">
        <table class="sales-table sales-list-table">
          <thead>
            <tr>
              <th>Invoice No</th>
              <th>Date</th>
              <th>Collection point</th>
              {!isBottled ? <th>DO No</th> : null}
              <th>Customer</th>
              <th>Product</th>
              <th>Status</th>
              <th class="sales-num">{qtyHeader}</th>
              <th class="sales-num">Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colCount} class="sales-empty-cell">
                  Loading invoices…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} class="sales-empty-cell">
                  No sales invoices match these filters.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id}>
                  <td class="sales-strong">{row.invoiceNo}</td>
                  <td>{formatDisplayDate(row.soldAtIso)}</td>
                  <td>{row.salesPointName}</td>
                  {!isBottled ? <td>{row.deliveryOrderNo ?? ""}</td> : null}
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
        </table>
      </div>

      {result && !isLoading ? (
        <div class="sales-list-footer">
          <div class="sales-list-footer-totals">
            {rows.length > 0 ? (
              <>
                <span>
                  Totals ({result.periodLabel}) · {result.totals.count} invoices
                </span>
                <span class="sales-num">{result.totals.totalQtyLabel}</span>
                <span class="sales-num">{result.totals.totalAmountXaf}</span>
              </>
            ) : (
              <span class="sales-muted">No invoices in this filter.</span>
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
