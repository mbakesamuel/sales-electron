import { useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import type { StockDocStatus } from "../../shared/stock.types.ts";
import { STOCK_DOC_STATUS_LABELS, statusBadgeClass } from "./stockDisplay.ts";
import { trimQty } from "./stockUtils.ts";

export function StatusBadge({ status }: { status: StockDocStatus }) {
  return <span class={statusBadgeClass(status)}>{STOCK_DOC_STATUS_LABELS[status]}</span>;
}

interface DocDialogProps {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: ComponentChildren;
}

export function DocDialog({ title, wide = false, onClose, children }: DocDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div class="stock-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        class="stock-modal-backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        class={`stock-modal-panel${wide ? " stock-modal-panel-wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div class="stock-modal-header">
          <div class="stock-modal-title">{title}</div>
          <button type="button" class="stock-modal-close" onClick={onClose}>
            X
          </button>
        </div>
        <div class="stock-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return createPortal(
    <div class="stock-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        class="stock-modal-backdrop"
        aria-label="Close"
        tabIndex={-1}
        onClick={onCancel}
      />
      <div class="stock-modal-panel stock-confirm-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div class="stock-modal-header">
          <div class="stock-modal-title">{title}</div>
        </div>
        <div class="stock-modal-body">
          <p class="stock-confirm-description">{description}</p>
          <div class="stock-modal-actions">
            <button type="button" class="stock-btn-secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </button>
            <button type="button" class="stock-btn-danger" disabled={busy} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ReviewKeyValue(props: { label: string; children: ComponentChildren }) {
  return (
    <div class="stock-review-row">
      <span class="stock-review-label">{props.label}</span>
      <span class="stock-review-value">{props.children}</span>
    </div>
  );
}

interface ReviewLine {
  productName: string;
  uom: string;
  qty: string;
  deltaQty?: string;
  storageLocationName?: string;
  fromStorageLocationName?: string;
  toStorageLocationName?: string | null;
}

export function ReviewLineTable(props: { lines: ReviewLine[]; qtyHeader?: string }) {
  const { lines, qtyHeader = "Quantity" } = props;
  const showLocation = lines.some((l) => l.storageLocationName);
  const showTransferLocations = lines.some(
    (l) => l.fromStorageLocationName || l.toStorageLocationName,
  );
  return (
    <div class="stock-table-wrap">
      <table class="stock-table">
        <thead>
          <tr>
            <th class="stock-col-narrow">#</th>
            <th>Product</th>
            {showLocation ? <th>Location</th> : null}
            {showTransferLocations ? (
              <>
                <th>From</th>
                <th>To</th>
              </>
            ) : null}
            <th class="stock-col-narrow">UOM</th>
            <th class="stock-num">{qtyHeader}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, idx) => (
            <tr key={idx}>
              <td class="stock-muted">{idx + 1}</td>
              <td class="stock-strong">{l.productName}</td>
              {showLocation ? <td class="stock-muted">{l.storageLocationName ?? "—"}</td> : null}
              {showTransferLocations ? (
                <>
                  <td class="stock-muted">{l.fromStorageLocationName ?? "—"}</td>
                  <td class="stock-muted">{l.toStorageLocationName ?? "Pending receipt"}</td>
                </>
              ) : null}
              <td class="stock-muted">{l.uom}</td>
              <td class="stock-num stock-strong">{trimQty(l.deltaQty ?? l.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
