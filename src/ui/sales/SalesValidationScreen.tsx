import { useEffect, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type {
  LoadedSaleView,
  SalesValidationQueuePage,
  SalesValidationQueueRow,
} from "../../shared/sales.types.ts";
import type { AuthUser } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import "./sales.css";

interface SalesValidationScreenProps {
  user: AuthUser;
}

function modeLabel(mode: SalesValidationQueueRow["saleProductMode"]): string {
  if (mode === "BOTTLE") {
    return "Bottle";
  }
  if (mode === "LOOSE") {
    return "Loose";
  }
  return "—";
}

export function SalesValidationScreen({ user }: SalesValidationScreenProps) {
  const [page, setPage] = useState<SalesValidationQueuePage | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [review, setReview] = useState<LoadedSaleView | null>(null);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  async function refresh() {
    setPage(await getElectronApi().sales.listValidationQueue(user.id));
  }

  useEffect(() => {
    void refresh().catch((error) => {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not load sales validation queue.",
      });
    });
  }, [user.id]);

  const selectedIds =
    page?.rows.filter((row) => selected[row.id]).map((row) => row.id) ?? [];

  const allChecked =
    page != null &&
    page.rows.length > 0 &&
    page.rows.every((row) => selected[row.id]);

  async function validateIds(saleIds: string[]) {
    if (saleIds.length === 0) {
      setMessage({ type: "error", text: "Select at least one invoice." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await getElectronApi().sales.validateMany({
        userId: user.id,
        saleIds,
      });
      if (result.ok === false) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      const errorText =
        result.errors.length > 0
          ? ` · ${result.errors.length} failed${
              result.errors[0]
                ? `: ${result.errors[0].invoiceNo ?? ""} ${result.errors[0].error}`.trim()
                : ""
            }`
          : "";
      setMessage({
        type: "ok",
        text: `Validated ${result.validated} invoice(s)${errorText}.`,
      });
      setSelected({});
      setReview(null);
      await refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Validation failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function openReview(row: SalesValidationQueueRow) {
    setReviewBusy(true);
    setMessage(null);
    try {
      const detail = await getElectronApi().sales.loadSaleByInvoiceNo(
        row.invoiceNo,
      );
      if (!detail) {
        setMessage({ type: "error", text: "Invoice not found." });
        return;
      }
      setReview(detail);
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <div class="sales-client">
      <div class="sales-panel">
        <div class="sales-panel-header">
          <div>
            <h3>Sales validation</h3>
            <p class="sales-muted">
              Pending sales invoices awaiting validation.
              {page ? ` ${page.totalPending} total pending.` : ""}
            </p>
          </div>
          <div class="sales-header-actions">
            <button
              type="button"
              class="sales-btn-secondary"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh
            </button>
            <button
              type="button"
              class="sales-btn-primary"
              disabled={busy || selectedIds.length === 0}
              onClick={() => void validateIds(selectedIds)}
            >
              {busy
                ? "Validating…"
                : `Validate selected (${selectedIds.length})`}
            </button>
          </div>
        </div>

        {message ? (
          <div class={`sales-banner sales-banner-${message.type}`}>
            {message.text}
          </div>
        ) : null}

        <div class="sales-table-wrap">
          {!page ? (
            <p class="sales-muted">Loading…</p>
          ) : (
            <table class="sales-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      aria-label="Select all"
                      onChange={(event) => {
                        const checked = (
                          event.currentTarget as HTMLInputElement
                        ).checked;
                        if (!page) return;
                        const next: Record<string, boolean> = {};
                        if (checked) {
                          for (const row of page.rows) {
                            next[row.id] = true;
                          }
                        }
                        setSelected(next);
                      }}
                    />
                  </th>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Collection point</th>
                  <th>Customer</th>
                  <th>Mode</th>
                  <th>Drafted by</th>
                  <th class="sales-num">Lines</th>
                  <th class="sales-num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} class="sales-empty">
                      No sales invoices are awaiting validation.
                    </td>
                  </tr>
                ) : (
                  page.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[row.id])}
                          aria-label={`Select ${row.invoiceNo}`}
                          onChange={(event) => {
                            const checked = (
                              event.currentTarget as HTMLInputElement
                            ).checked;
                            setSelected((current) => ({
                              ...current,
                              [row.id]: checked,
                            }));
                          }}
                        />
                      </td>
                      <td>{row.invoiceNo}</td>
                      <td>{formatDisplayDate(row.dateIssuedIso)}</td>
                      <td>{row.salesPointName ?? "—"}</td>
                      <td>{row.customerName}</td>
                      <td>{modeLabel(row.saleProductMode)}</td>
                      <td>{row.createdByName}</td>
                      <td class="sales-num">{row.lineCount}</td>
                      <td class="sales-num">{row.totalLabel}</td>
                      <td class="sales-row-actions">
                        <button
                          type="button"
                          class="sales-btn-secondary sales-btn-small"
                          disabled={reviewBusy || busy}
                          onClick={() => void openReview(row)}
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          class="sales-btn-primary sales-btn-small"
                          disabled={busy}
                          onClick={() => void validateIds([row.id])}
                        >
                          Validate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {review ? (
        <div class="sales-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            class="sales-modal-backdrop"
            aria-label="Close"
            onClick={() => setReview(null)}
          />
          <div class="sales-modal-panel sales-modal-panel-wide">
            <div class="sales-modal-header">
              <div class="sales-modal-title">
                Review invoice {review.invoiceNo}
              </div>
              <button
                type="button"
                class="sales-modal-close"
                onClick={() => setReview(null)}
              >
                X
              </button>
            </div>
            <div class="sales-modal-body">
              <p class="sales-muted">
                {review.customerName}
                {" · "}
                {review.salesPointName ?? "No collection point"}
                {" · "}
                {formatDisplayDate(review.dateIssuedIso)}
                {" · "}
                {modeLabel(review.saleProductMode)}
                {" · Drafted by "}
                {review.createdByName}
              </p>
              <div class="sales-table-wrap">
                <table class="sales-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th class="sales-num">Qty</th>
                      <th class="sales-num">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.lines.map((line, idx) => (
                      <tr key={`${line.productId}-${idx}`}>
                        <td>{line.productName}</td>
                        <td class="sales-num">
                          {line.qtyUnits ?? line.qtyKg}
                        </td>
                        <td class="sales-num">{line.lineGross}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p class="sales-strong">
                Gross: {review.grossAmount} · VAT: {review.vatAmount} · Net:{" "}
                {review.netAmount}
              </p>
              <div class="sales-modal-actions">
                <button
                  type="button"
                  class="sales-btn-secondary"
                  onClick={() => setReview(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  class="sales-btn-primary"
                  disabled={busy || review.status !== "PENDING"}
                  onClick={() => void validateIds([review.id])}
                >
                  {busy ? "Validating…" : "Validate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
