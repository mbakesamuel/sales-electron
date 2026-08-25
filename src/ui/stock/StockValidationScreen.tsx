import { useEffect, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type {
  AdjustmentDetail,
  ReceiptDetail,
  StockValidationDocKind,
  StockValidationQueuePage,
  StockValidationQueueRow,
  TransferDetail,
} from "../../shared/stock.types.ts";
import type { AuthUser } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import { DocDialog, ReviewKeyValue, ReviewLineTable } from "./StockDialogs.tsx";
import { trimQty } from "./stockUtils.ts";
import "./StockScreen.css";

interface StockValidationScreenProps {
  user: AuthUser;
}

type ReviewState =
  | { kind: "RECEIPT"; detail: ReceiptDetail }
  | { kind: "TRANSFER"; detail: TransferDetail }
  | { kind: "ADJUSTMENT"; detail: AdjustmentDetail };

function rowKey(row: { kind: StockValidationDocKind; id: string }): string {
  return `${row.kind}:${row.id}`;
}

function kindLabel(kind: StockValidationDocKind): string {
  switch (kind) {
    case "RECEIPT":
      return "Receipt";
    case "TRANSFER":
      return "Transfer";
    case "ADJUSTMENT":
      return "Adjustment";
    default:
      return kind;
  }
}

function moduleLabel(filter: "bulk" | "bottled"): string {
  return filter === "bottled" ? "Bottled" : "Bulk";
}

function actionLabel(row: StockValidationQueueRow): string {
  if (row.kind === "TRANSFER" && row.transferMode === "INTER_SALES_POINT") {
    return "Dispatch";
  }
  return "Post";
}

export function StockValidationScreen({ user }: StockValidationScreenProps) {
  const [page, setPage] = useState<StockValidationQueuePage | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  async function refresh() {
    setPage(await getElectronApi().stock.listValidationQueue(user.id));
  }

  useEffect(() => {
    void refresh().catch((error) => {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not load stock validation queue.",
      });
    });
  }, [user.id]);

  const selectedItems =
    page?.rows.filter((row) => selected[rowKey(row)]) ?? [];

  const allChecked =
    page != null &&
    page.rows.length > 0 &&
    page.rows.every((row) => selected[rowKey(row)]);

  async function validateItems(
    items: Array<{ kind: StockValidationDocKind; id: string }>,
  ) {
    if (items.length === 0) {
      setMessage({ type: "error", text: "Select at least one document." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await getElectronApi().stock.validateMany({
        userId: user.id,
        items,
      });
      if (result.ok === false) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      const errorText =
        result.errors.length > 0
          ? ` · ${result.errors.length} failed${
              result.errors[0] ? `: ${result.errors[0].error}` : ""
            }`
          : "";
      setMessage({
        type: "ok",
        text: `Validated ${result.validated} document(s)${errorText}.`,
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

  async function openReview(row: StockValidationQueueRow) {
    setReviewBusy(true);
    setMessage(null);
    try {
      if (row.kind === "RECEIPT") {
        const res = await getElectronApi().stock.loadReceiptForReview({
          userId: user.id,
          receiptId: row.id,
        });
        if (res.ok === false) {
          setMessage({ type: "error", text: res.error });
          return;
        }
        setReview({ kind: "RECEIPT", detail: res.detail });
        return;
      }
      if (row.kind === "TRANSFER") {
        const res = await getElectronApi().stock.loadTransferForReview({
          userId: user.id,
          transferId: row.id,
        });
        if (res.ok === false) {
          setMessage({ type: "error", text: res.error });
          return;
        }
        setReview({ kind: "TRANSFER", detail: res.detail });
        return;
      }
      const res = await getElectronApi().stock.loadAdjustmentForReview({
        userId: user.id,
        adjustmentId: row.id,
      });
      if (res.ok === false) {
        setMessage({ type: "error", text: res.error });
        return;
      }
      setReview({ kind: "ADJUSTMENT", detail: res.detail });
    } finally {
      setReviewBusy(false);
    }
  }

  const reviewRow =
    review && page
      ? page.rows.find(
          (row) =>
            row.kind === review.kind &&
            row.id ===
              (review.kind === "RECEIPT"
                ? review.detail.id
                : review.kind === "TRANSFER"
                  ? review.detail.id
                  : review.detail.id),
        )
      : null;

  return (
    <div class="stock-screen">
      <header class="stock-header">
        <div class="stock-header-text">
          <h1>Stock validation</h1>
          <p class="stock-header-subtitle">
            Draft receipts, transfers, and adjustments awaiting validation.
            {page ? ` ${page.totalPending} pending.` : ""}
          </p>
        </div>
        <div class="stock-header-actions">
          <button
            type="button"
            class="stock-btn-secondary"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Refresh
          </button>
          <button
            type="button"
            class="stock-btn-primary"
            disabled={busy || selectedItems.length === 0}
            onClick={() =>
              void validateItems(
                selectedItems.map((row) => ({ kind: row.kind, id: row.id })),
              )
            }
          >
            {busy
              ? "Validating…"
              : `Validate selected (${selectedItems.length})`}
          </button>
        </div>
      </header>

      {message ? (
        <div class={`stock-banner stock-banner-${message.type}`}>
          {message.text}
        </div>
      ) : null}

      <div class="stock-table-wrap">
        {!page ? (
          <p class="stock-hint">Loading…</p>
        ) : (
          <table class="stock-table">
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
                          next[rowKey(row)] = true;
                        }
                      }
                      setSelected(next);
                    }}
                  />
                </th>
                <th>Type</th>
                <th>Document #</th>
                <th>Module</th>
                <th>From</th>
                <th>To</th>
                <th>Date</th>
                <th>Drafted by</th>
                <th class="stock-num">Lines</th>
                <th class="stock-num">Qty</th>
                <th class="stock-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.length === 0 ? (
                <tr>
                  <td colSpan={11} class="stock-empty-cell">
                    No draft stock documents are awaiting validation.
                  </td>
                </tr>
              ) : (
                page.rows.map((row) => (
                  <tr key={rowKey(row)}>
                    <td>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[rowKey(row)])}
                        aria-label={`Select ${row.documentNo}`}
                        onChange={(event) => {
                          const checked = (
                            event.currentTarget as HTMLInputElement
                          ).checked;
                          setSelected((current) => ({
                            ...current,
                            [rowKey(row)]: checked,
                          }));
                        }}
                      />
                    </td>
                    <td>{kindLabel(row.kind)}</td>
                    <td class="stock-mono">{row.documentNo}</td>
                    <td>{moduleLabel(row.productFilter)}</td>
                    <td>{row.fromSalesPointName}</td>
                    <td>
                      {row.kind === "TRANSFER"
                        ? (row.toSalesPointName ?? "—")
                        : "—"}
                    </td>
                    <td class="stock-nowrap">
                      {formatDisplayDate(row.documentDateIso)}
                    </td>
                    <td>{row.createdByName}</td>
                    <td class="stock-num">{row.lineCount}</td>
                    <td class="stock-num">{trimQty(row.totalQty)}</td>
                    <td class="stock-actions-col">
                      <div class="stock-actions-cell">
                        <button
                          type="button"
                          class="stock-btn-secondary stock-btn-small"
                          disabled={reviewBusy || busy}
                          onClick={() => void openReview(row)}
                        >
                          Review
                        </button>
                        <button
                          type="button"
                          class="stock-btn-primary stock-btn-small"
                          disabled={busy}
                          onClick={() =>
                            void validateItems([
                              { kind: row.kind, id: row.id },
                            ])
                          }
                        >
                          {actionLabel(row)}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {review ? (
        <DocDialog
          title={`Review ${kindLabel(review.kind).toLowerCase()} ${
            review.kind === "RECEIPT"
              ? review.detail.receiptNo
              : review.kind === "TRANSFER"
                ? review.detail.transferNo
                : review.detail.adjustmentNo
          }`}
          wide
          onClose={() => setReview(null)}
        >
          <div class="stock-form">
            {review.kind === "RECEIPT" ? (
              <>
                <ReviewKeyValue label="Collection point">
                  {review.detail.salesPointName}
                </ReviewKeyValue>
                <ReviewKeyValue label="Supplier">
                  {review.detail.supplierLabel}
                </ReviewKeyValue>
                <ReviewKeyValue label="Date">
                  {formatDisplayDate(review.detail.receivedAtIso)}
                </ReviewKeyValue>
                <ReviewLineTable
                  lines={review.detail.lines.map((l) => ({
                    productName: l.productName,
                    uom: l.uom,
                    qty: l.qty,
                    storageLocationName: l.storageLocationName,
                  }))}
                />
              </>
            ) : null}
            {review.kind === "TRANSFER" ? (
              <>
                <ReviewKeyValue label="From">
                  {review.detail.fromSalesPointName}
                </ReviewKeyValue>
                <ReviewKeyValue label="To">
                  {review.detail.toSalesPointName}
                </ReviewKeyValue>
                <ReviewKeyValue label="Date">
                  {formatDisplayDate(review.detail.dispatchedAtIso)}
                </ReviewKeyValue>
                <ReviewLineTable
                  lines={review.detail.lines.map((l) => ({
                    productName: l.productName,
                    uom: l.uom,
                    qty: l.qty,
                    fromStorageLocationName: l.fromStorageLocationName,
                    toStorageLocationName: l.toStorageLocationName,
                  }))}
                />
              </>
            ) : null}
            {review.kind === "ADJUSTMENT" ? (
              <>
                <ReviewKeyValue label="Collection point">
                  {review.detail.salesPointName}
                </ReviewKeyValue>
                <ReviewKeyValue label="Reason">
                  {review.detail.reason}
                </ReviewKeyValue>
                <ReviewKeyValue label="Date">
                  {formatDisplayDate(review.detail.occurredAtIso)}
                </ReviewKeyValue>
                <ReviewLineTable
                  qtyHeader="Delta"
                  lines={review.detail.lines.map((l) => ({
                    productName: l.productName,
                    uom: l.uom,
                    qty: l.deltaQty,
                    deltaQty: l.deltaQty,
                    storageLocationName: l.storageLocationName,
                  }))}
                />
              </>
            ) : null}

            <div class="stock-modal-actions">
              <button
                type="button"
                class="stock-btn-secondary"
                onClick={() => setReview(null)}
              >
                Close
              </button>
              <button
                type="button"
                class="stock-btn-primary"
                disabled={busy}
                onClick={() =>
                  void validateItems([
                    {
                      kind: review.kind,
                      id: review.detail.id,
                    },
                  ])
                }
              >
                {busy
                  ? "Validating…"
                  : reviewRow
                    ? actionLabel(reviewRow)
                    : "Validate"}
              </button>
            </div>
          </div>
        </DocDialog>
      ) : null}
    </div>
  );
}
