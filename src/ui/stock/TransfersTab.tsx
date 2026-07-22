import { useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import type {
  ProductOption,
  SalesPointOption,
  StockBalanceRow,
  StorageLocationOption,
  TransferDetail,
  TransferListRow,
} from "../../shared/stock.types.ts";
import { ConfirmDialog, DocDialog, ReviewKeyValue, ReviewLineTable, StatusBadge } from "./StockDialogs.tsx";
import { TransferLineEditor, type TransferLineDraft } from "./LineEditors.tsx";
import {
  defaultLocationId,
  formatDate,
  formatDateTime,
  locationsForSalesPoint,
  trimQty,
  utcIsoDateToday,
} from "./stockUtils.ts";
import { STOCK_DOC_STATUS_LABELS } from "./stockDisplay.ts";
import { TRANSFER_MODE_LABELS } from "../../shared/stockTransferMode.ts";

type FormTransferMode = "inter" | "intra";

function defaultToLocationId(
  storageLocations: StorageLocationOption[],
  salesPointId: string,
  excludeLocationId: string,
): string {
  const locs = locationsForSalesPoint(storageLocations, salesPointId);
  const other = locs.find((loc) => String(loc.id) !== excludeLocationId);
  return other ? String(other.id) : "";
}

function isIntraRow(row: TransferListRow): boolean {
  return row.transferMode === "INTRA_SALES_POINT";
}

interface TransfersTabProps {
  rows: TransferListRow[];
  salesPoints: SalesPointOption[];
  storageLocations: StorageLocationOption[];
  products: ProductOption[];
  onHand: StockBalanceRow[];
  scopedSalesPointId: number | null;
  canDispatch: boolean;
  canReceive: boolean;
  canCancel: boolean;
  canDraft: boolean;
  userId: string;
  onOk: (text: string) => void;
  onErr: (text: string) => void;
}

export function TransfersTab(props: TransfersTabProps) {
  const {
    rows,
    salesPoints,
    storageLocations,
    products,
    onHand,
    scopedSalesPointId,
    userId,
  } = props;
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormTransferMode>("inter");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromSalesPointId, setFromSalesPointId] = useState<string>(
    scopedSalesPointId != null ? String(scopedSalesPointId) : "",
  );
  const [toSalesPointId, setToSalesPointId] = useState<string>("");
  const [dispatchedAt, setDispatchedAt] = useState(utcIsoDateToday());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLineDraft[]>(() => [
    {
      productId: "",
      qty: "",
      fromStorageLocationId: defaultLocationId(storageLocations, scopedSalesPointId ?? ""),
    },
  ]);
  const [pendingCancel, setPendingCancel] = useState<TransferListRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [lookupNo, setLookupNo] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [reviewDetail, setReviewDetail] = useState<TransferDetail | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [receiveDetail, setReceiveDetail] = useState<TransferDetail | null>(null);
  const [receiveLines, setReceiveLines] = useState<
    { lineId: string; toStorageLocationId: string }[]
  >([]);

  function resetForm() {
    setEditingId(null);
    setFormMode("inter");
    const from = scopedSalesPointId != null ? String(scopedSalesPointId) : "";
    setFromSalesPointId(from);
    setToSalesPointId("");
    setDispatchedAt(utcIsoDateToday());
    setNotes("");
    setLines([
      { productId: "", qty: "", fromStorageLocationId: defaultLocationId(storageLocations, from) },
    ]);
  }

  function onFormModeChange(nextMode: FormTransferMode) {
    setFormMode(nextMode);
    if (nextMode === "intra") {
      if (fromSalesPointId) {
        setToSalesPointId(fromSalesPointId);
      }
      const defFrom = defaultLocationId(storageLocations, fromSalesPointId);
      const defTo = defaultToLocationId(storageLocations, fromSalesPointId, defFrom);
      setLines((prev) =>
        prev.map((l) => ({
          ...l,
          toStorageLocationId: l.toStorageLocationId || defTo,
        })),
      );
    } else {
      if (toSalesPointId === fromSalesPointId) {
        setToSalesPointId("");
      }
      setLines((prev) =>
        prev.map(({ toStorageLocationId: _to, ...l }) => l),
      );
    }
  }

  function onFromSalesPointChange(nextId: string) {
    setFromSalesPointId(nextId);
    const defFrom = defaultLocationId(storageLocations, nextId);
    const defTo = defaultToLocationId(storageLocations, nextId, defFrom);
    if (formMode === "intra") {
      setToSalesPointId(nextId);
    }
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        fromStorageLocationId: locationsForSalesPoint(storageLocations, nextId).some(
          (loc) => String(loc.id) === l.fromStorageLocationId,
        )
          ? l.fromStorageLocationId
          : defFrom,
        ...(formMode === "intra"
          ? {
              toStorageLocationId: locationsForSalesPoint(storageLocations, nextId).some(
                (loc) => String(loc.id) === l.toStorageLocationId,
              )
                ? l.toStorageLocationId
                : defTo,
            }
          : {}),
      })),
    );
  }

  function openReceiveDialog(detail: TransferDetail) {
    setReceiveDetail(detail);
    setReceiveLines(
      detail.lines.map((l) => ({
        lineId: l.id,
        toStorageLocationId: defaultLocationId(storageLocations, detail.toSalesPointId),
      })),
    );
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  async function onSave(event: Event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const fromSp = Number.parseInt(fromSalesPointId, 10);
      const toSp =
        formMode === "intra" ? fromSp : Number.parseInt(toSalesPointId, 10);
      const res = await getElectronApi().stock.saveTransfer({
        userId,
        id: editingId,
        fromSalesPointId: fromSp,
        toSalesPointId: toSp,
        dispatchedAt,
        notes: notes || null,
        lines: lines
          .filter((l) => {
            if (!l.productId || !l.qty || !l.fromStorageLocationId) return false;
            if (formMode === "intra") return Boolean(l.toStorageLocationId);
            return true;
          })
          .map((l) => ({
            productId: Number.parseInt(l.productId, 10),
            qty: l.qty,
            fromStorageLocationId: Number.parseInt(l.fromStorageLocationId, 10),
            ...(formMode === "intra" && l.toStorageLocationId
              ? { toStorageLocationId: Number.parseInt(l.toStorageLocationId, 10) }
              : {}),
          })),
      });
      if (res.ok) {
        props.onOk(
          editingId ? `Transfer ${res.documentNo} updated.` : `Transfer ${res.documentNo} drafted.`,
        );
        setOpen(false);
        resetForm();
      } else {
        props.onErr(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPost(id: string) {
    setBusy(true);
    try {
      const res = await getElectronApi().stock.postInternalTransfer({ userId, transferId: id });
      if (res.ok) {
        props.onOk("Location move posted; balances updated.");
        if (reviewDetail?.id === id) setReviewDetail(null);
      } else {
        props.onErr(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onDispatch(id: string) {
    setBusy(true);
    try {
      const res = await getElectronApi().stock.dispatchTransfer({ userId, transferId: id });
      if (res.ok) {
        props.onOk("Transfer dispatched; source balance updated.");
        if (reviewDetail?.id === id) setReviewDetail(null);
      } else {
        props.onErr(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function openReceiveById(id: string) {
    setReviewBusy(true);
    try {
      const res = await getElectronApi().stock.loadTransferForReview({ userId, transferId: id });
      if (res.ok) openReceiveDialog(res.detail);
      else props.onErr(res.error);
    } finally {
      setReviewBusy(false);
    }
  }

  async function onReceiveSubmit(event: Event) {
    event.preventDefault();
    if (!receiveDetail || busy) return;
    setBusy(true);
    try {
      const res = await getElectronApi().stock.receiveTransfer({
        userId,
        transferId: receiveDetail.id,
        lines: receiveLines
          .filter((l) => l.toStorageLocationId)
          .map((l) => ({
            lineId: l.lineId,
            toStorageLocationId: Number.parseInt(l.toStorageLocationId, 10),
          })),
      });
      if (res.ok) {
        props.onOk("Transfer received; destination balance updated.");
        setReceiveDetail(null);
        if (reviewDetail?.id === receiveDetail.id) setReviewDetail(null);
      } else {
        props.onErr(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onCancelTransfer() {
    if (!pendingCancel) return;
    const id = pendingCancel.id;
    setPendingCancel(null);
    setBusy(true);
    try {
      const res = await getElectronApi().stock.cancelTransfer({ userId, transferId: id });
      if (res.ok) {
        props.onOk("Transfer cancelled.");
        if (reviewDetail?.id === id) setReviewDetail(null);
      } else {
        props.onErr(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function openReviewById(id: string) {
    setReviewBusy(true);
    try {
      const res = await getElectronApi().stock.loadTransferForReview({ userId, transferId: id });
      if (res.ok) setReviewDetail(res.detail);
      else props.onErr(res.error);
    } finally {
      setReviewBusy(false);
    }
  }

  function populateFormFromDetail(detail: TransferDetail) {
    const intra = detail.transferMode === "INTRA_SALES_POINT";
    setEditingId(detail.id);
    setFormMode(intra ? "intra" : "inter");
    setFromSalesPointId(String(detail.fromSalesPointId));
    setToSalesPointId(String(detail.toSalesPointId));
    setDispatchedAt(
      detail.dispatchedAtIso
        ? detail.dispatchedAtIso.length > 10
          ? detail.dispatchedAtIso.slice(0, 10)
          : detail.dispatchedAtIso
        : utcIsoDateToday(),
    );
    setNotes(detail.notes ?? "");
    const defFrom = defaultLocationId(storageLocations, detail.fromSalesPointId);
    const defTo = defaultToLocationId(storageLocations, String(detail.fromSalesPointId), defFrom);
    setLines(
      detail.lines.length > 0
        ? detail.lines.map((l) => ({
            productId: String(l.productId),
            qty: l.qty,
            fromStorageLocationId: String(l.fromStorageLocationId),
            ...(intra
              ? {
                  toStorageLocationId: l.toStorageLocationId
                    ? String(l.toStorageLocationId)
                    : defTo,
                }
              : {}),
          }))
        : [
            {
              productId: "",
              qty: "",
              fromStorageLocationId: defFrom,
              ...(intra ? { toStorageLocationId: defTo } : {}),
            },
          ],
    );
    setOpen(true);
  }

  async function openEditById(id: string) {
    setReviewBusy(true);
    try {
      const res = await getElectronApi().stock.loadTransferForReview({ userId, transferId: id });
      if (res.ok) {
        if (res.detail.status !== "DRAFT") {
          props.onErr("Only draft transfers can be edited.");
          return;
        }
        setReviewDetail(null);
        populateFormFromDetail(res.detail);
      } else {
        props.onErr(res.error);
      }
    } finally {
      setReviewBusy(false);
    }
  }

  async function onLookup(event: Event) {
    event.preventDefault();
    if (lookupBusy) return;
    const n = lookupNo.trim();
    if (!n) return;
    setLookupBusy(true);
    try {
      const res = await getElectronApi().stock.findTransferByNumber({ userId, transferNo: n });
      if (res.ok) {
        setReviewDetail(res.detail);
        setLookupNo("");
      } else {
        props.onErr(res.error);
      }
    } finally {
      setLookupBusy(false);
    }
  }

  return (
    <section class="stock-section">
      <div class="stock-section-header">
        <div>
          <h2>Stock transfers</h2>
          {props.canDispatch ? (
            <p class="stock-hint">
              Pull a draft voucher by its number to cross-check the lines before dispatching.
            </p>
          ) : (
            <p class="stock-hint">
              Draft a transfer, then submit it to your supervisor for dispatch.
            </p>
          )}
        </div>
        <div class="stock-header-actions">
          {props.canDispatch ? (
            <form onSubmit={onLookup} class="stock-lookup-row" aria-label="Pull voucher by number">
              <input
                value={lookupNo}
                onInput={(event) => setLookupNo((event.currentTarget as HTMLInputElement).value)}
                placeholder="ST-2026-000001"
                class="stock-lookup-input"
                aria-label="Transfer number"
              />
              <button
                type="submit"
                class="stock-btn-secondary"
                disabled={lookupBusy || !lookupNo.trim()}
              >
                {lookupBusy ? "…" : "Pull voucher"}
              </button>
            </form>
          ) : null}
          {props.canDraft ? (
            <button type="button" class="stock-btn-primary" onClick={openCreate}>
              New transfer
            </button>
          ) : null}
        </div>
      </div>

      <div class="stock-table-wrap">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Transfer #</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Dispatched</th>
              <th>Received</th>
              <th class="stock-num">Total qty</th>
              <th>Status</th>
              <th>Created by</th>
              <th class="stock-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} class="stock-empty-cell">
                  No transfers recorded yet.
                  {props.canDraft ? (
                    <>
                      {" "}
                      Use <span class="stock-strong">New transfer</span> to create one.
                    </>
                  ) : null}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const intra = isIntraRow(r);
                const isSourceUser =
                  scopedSalesPointId == null || scopedSalesPointId === r.fromSalesPointId;
                const isDestUser =
                  scopedSalesPointId == null || scopedSalesPointId === r.toSalesPointId;
                return (
                  <tr key={r.id}>
                    <td class="stock-mono">{r.transferNo}</td>
                    <td>{TRANSFER_MODE_LABELS[r.transferMode]}</td>
                    <td>{r.fromSalesPointName}</td>
                    <td>{intra ? (r.locationSummary ?? "—") : r.toSalesPointName}</td>
                    <td class="stock-nowrap">
                      {r.dispatchedAtIso ? formatDate(r.dispatchedAtIso) : "—"}
                      {r.dispatchedByName ? (
                        <div class="stock-subtext">by {r.dispatchedByName}</div>
                      ) : null}
                    </td>
                    <td class="stock-nowrap">
                      {r.receivedAtIso ? formatDate(r.receivedAtIso) : "—"}
                      {r.receivedByName ? (
                        <div class="stock-subtext">by {r.receivedByName}</div>
                      ) : null}
                    </td>
                    <td class="stock-num">{trimQty(r.totalQty)}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td class="stock-muted">
                      <div>{r.createdByName}</div>
                      <div class="stock-subtext">{formatDateTime(r.createdAtIso)}</div>
                    </td>
                    <td class="stock-actions-col">
                      <div class="stock-actions-cell">
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() => void openReviewById(r.id)}
                        class="stock-btn-secondary stock-btn-small"
                        title="View lines"
                      >
                        Review
                      </button>
                      {r.status === "DRAFT" && isSourceUser ? (
                        <button
                          type="button"
                          disabled={busy || reviewBusy}
                          onClick={() => void openEditById(r.id)}
                          class="stock-btn-secondary stock-btn-small"
                          title="Correct draft"
                        >
                          Edit
                        </button>
                      ) : null}
                      {r.status === "DRAFT" && props.canDispatch && isSourceUser && intra ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onPost(r.id)}
                          class="stock-btn-primary stock-btn-small"
                        >
                          Post
                        </button>
                      ) : null}
                      {r.status === "DRAFT" && props.canDispatch && isSourceUser && !intra ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onDispatch(r.id)}
                          class="stock-btn-primary stock-btn-small"
                        >
                          Dispatch
                        </button>
                      ) : null}
                      {r.status === "DISPATCHED" && props.canReceive && isDestUser && !intra ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void openReceiveById(r.id)}
                          class="stock-btn-primary stock-btn-small"
                        >
                          Receive
                        </button>
                      ) : null}
                      {r.status === "DRAFT" ||
                      ((r.status === "DISPATCHED" || r.status === "RECEIVED") && props.canCancel) ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setPendingCancel(r)}
                          class="stock-btn-danger stock-btn-small"
                        >
                          {r.status === "DRAFT" ? "Delete" : "Cancel"}
                        </button>
                      ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {open ? (
        <DocDialog title={editingId ? "Edit transfer" : "New transfer"} wide onClose={() => setOpen(false)}>
          <form onSubmit={onSave} class="stock-form">
            <div class="stock-form-row">
              <span class="stock-form-label">Transfer type</span>
              <div class="stock-form-control-wrap">
                <select
                  class="stock-form-control"
                  value={formMode}
                  onChange={(event) =>
                    onFormModeChange(
                      (event.currentTarget as HTMLSelectElement).value as FormTransferMode,
                    )
                  }
                >
                  <option value="inter">Between sales points</option>
                  <option value="intra">Within sales point</option>
                </select>
                {formMode === "intra" ? (
                  <p class="stock-hint">
                    Move stock between storage locations at one sales point. Posting applies both
                    out and in movements in one step.
                  </p>
                ) : null}
              </div>
            </div>

            <label class="stock-form-row">
              <span class="stock-form-label">
                {formMode === "intra" ? "Sales point" : "From"}
              </span>
              <select
                class="stock-form-control"
                value={fromSalesPointId}
                onChange={(event) => onFromSalesPointChange((event.currentTarget as HTMLSelectElement).value)}
                required
                disabled={scopedSalesPointId != null}
              >
                <option value="">Select…</option>
                {salesPoints.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </label>
            {formMode === "inter" ? (
              <label class="stock-form-row">
                <span class="stock-form-label">To</span>
                <select
                  class="stock-form-control"
                  value={toSalesPointId}
                  onChange={(event) => setToSalesPointId((event.currentTarget as HTMLSelectElement).value)}
                  required
                >
                  <option value="">Select…</option>
                  {salesPoints
                    .filter((sp) => String(sp.id) !== fromSalesPointId)
                    .map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
            <label class="stock-form-row">
              <span class="stock-form-label">
                {formMode === "intra" ? "Move date" : "Dispatch date"}
              </span>
              <input
                type="date"
                class="stock-form-control"
                value={dispatchedAt}
                onInput={(event) => setDispatchedAt((event.currentTarget as HTMLInputElement).value)}
                required
              />
            </label>
            <label class="stock-form-row">
              <span class="stock-form-label">Notes</span>
              <input
                class="stock-form-control"
                value={notes}
                onInput={(event) => setNotes((event.currentTarget as HTMLInputElement).value)}
              />
            </label>

            {formMode === "intra" &&
            fromSalesPointId &&
            locationsForSalesPoint(storageLocations, fromSalesPointId).length < 2 ? (
              <p class="stock-hint stock-hint-warn">
                Add at least two storage locations for this sales point to move stock between bins.
              </p>
            ) : null}

            <TransferLineEditor
              products={products}
              lines={lines}
              onChange={setLines}
              mode={formMode}
              fromSalesPointId={fromSalesPointId}
              onHand={onHand}
              fromLocationOptions={locationsForSalesPoint(storageLocations, fromSalesPointId)}
              toLocationOptions={locationsForSalesPoint(storageLocations, fromSalesPointId)}
              defaultFromLocationId={defaultLocationId(storageLocations, fromSalesPointId)}
              defaultToLocationId={defaultToLocationId(
                storageLocations,
                fromSalesPointId,
                defaultLocationId(storageLocations, fromSalesPointId),
              )}
            />

            <div class="stock-modal-actions">
              <button type="submit" disabled={busy} class="stock-btn-primary">
                {editingId ? "Save changes" : "Create draft"}
              </button>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} class="stock-btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </DocDialog>
      ) : null}

      {pendingCancel ? (
        <ConfirmDialog
          title={pendingCancel.status === "DRAFT" ? "Delete this transfer?" : "Cancel transfer?"}
          description={
            pendingCancel.status === "DRAFT"
              ? `Draft transfer ${pendingCancel.transferNo} will be removed.`
              : `Transfer ${pendingCancel.transferNo} is ${STOCK_DOC_STATUS_LABELS[pendingCancel.status].toLowerCase()}. Cancelling writes compensating movements to reverse every line.`
          }
          confirmLabel={pendingCancel.status === "DRAFT" ? "Delete" : "Cancel transfer"}
          busy={busy}
          onCancel={() => setPendingCancel(null)}
          onConfirm={onCancelTransfer}
        />
      ) : null}

      {reviewDetail ? (
        <DocDialog title={`Review transfer ${reviewDetail.transferNo}`} wide onClose={() => setReviewDetail(null)}>
          <div class="stock-review">
            <div class="stock-review-top">
              <StatusBadge status={reviewDetail.status} />
            </div>

            <div class="stock-review-grid">
              <ReviewKeyValue label="Type">
                {TRANSFER_MODE_LABELS[reviewDetail.transferMode]}
              </ReviewKeyValue>
              <ReviewKeyValue label="From">{reviewDetail.fromSalesPointName}</ReviewKeyValue>
              <ReviewKeyValue label={isIntraRow(reviewDetail) ? "Locations" : "To"}>
                {isIntraRow(reviewDetail)
                  ? (reviewDetail.locationSummary ?? "—")
                  : reviewDetail.toSalesPointName}
              </ReviewKeyValue>
              <ReviewKeyValue label="Dispatched">
                {reviewDetail.dispatchedAtIso ? formatDate(reviewDetail.dispatchedAtIso) : "—"}
                {reviewDetail.dispatchedByName ? (
                  <span class="stock-subtext"> by {reviewDetail.dispatchedByName}</span>
                ) : null}
              </ReviewKeyValue>
              <ReviewKeyValue label="Received">
                {reviewDetail.receivedAtIso ? formatDate(reviewDetail.receivedAtIso) : "—"}
                {reviewDetail.receivedByName ? (
                  <span class="stock-subtext"> by {reviewDetail.receivedByName}</span>
                ) : null}
              </ReviewKeyValue>
              <ReviewKeyValue label="Drafted by">
                {reviewDetail.createdByName}
                <span class="stock-subtext"> {formatDateTime(reviewDetail.createdAtIso)}</span>
              </ReviewKeyValue>
              {reviewDetail.notes ? <ReviewKeyValue label="Notes">{reviewDetail.notes}</ReviewKeyValue> : null}
            </div>

            <ReviewLineTable lines={reviewDetail.lines} />

            <div class="stock-modal-actions">
              <button type="button" class="stock-btn-secondary" onClick={() => setReviewDetail(null)}>
                Close
              </button>
              {reviewDetail.status === "DRAFT" ||
              ((reviewDetail.status === "DISPATCHED" || reviewDetail.status === "RECEIVED") && props.canCancel) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingCancel(reviewDetail)}
                  class="stock-btn-danger"
                >
                  {reviewDetail.status === "DRAFT" ? "Delete draft" : "Cancel transfer"}
                </button>
              ) : null}
              {reviewDetail.status === "DRAFT" &&
              (scopedSalesPointId == null || scopedSalesPointId === reviewDetail.fromSalesPointId) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void openEditById(reviewDetail.id)}
                  class="stock-btn-secondary"
                  title="Correct the draft before dispatching"
                >
                  Edit draft
                </button>
              ) : null}
              {reviewDetail.status === "DRAFT" &&
              props.canDispatch &&
              (scopedSalesPointId == null || scopedSalesPointId === reviewDetail.fromSalesPointId) &&
              isIntraRow(reviewDetail) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onPost(reviewDetail.id)}
                  class="stock-btn-primary"
                >
                  Post location move
                </button>
              ) : null}
              {reviewDetail.status === "DRAFT" &&
              props.canDispatch &&
              (scopedSalesPointId == null || scopedSalesPointId === reviewDetail.fromSalesPointId) &&
              !isIntraRow(reviewDetail) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDispatch(reviewDetail.id)}
                  class="stock-btn-primary"
                >
                  Dispatch transfer
                </button>
              ) : null}
              {reviewDetail.status === "DISPATCHED" &&
              props.canReceive &&
              (scopedSalesPointId == null || scopedSalesPointId === reviewDetail.toSalesPointId) &&
              !isIntraRow(reviewDetail) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openReceiveDialog(reviewDetail)}
                  class="stock-btn-primary"
                >
                  Receive transfer
                </button>
              ) : null}
            </div>
          </div>
        </DocDialog>
      ) : null}

      {receiveDetail ? (
        <DocDialog title={`Receive transfer ${receiveDetail.transferNo}`} wide onClose={() => setReceiveDetail(null)}>
          <form onSubmit={onReceiveSubmit} class="stock-form">
            <p class="stock-hint">
              Choose where each line should be stored at {receiveDetail.toSalesPointName}.
            </p>
            <div class="stock-table-wrap">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>From</th>
                    <th class="stock-num">Qty</th>
                    <th>Receive into</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveDetail.lines.map((line) => {
                    const receiveLine = receiveLines.find((l) => l.lineId === line.id);
                    const toLocationOptions = locationsForSalesPoint(
                      storageLocations,
                      receiveDetail.toSalesPointId,
                    );
                    return (
                      <tr key={line.id}>
                        <td class="stock-strong">{line.productName}</td>
                        <td class="stock-muted">{line.fromStorageLocationName ?? "—"}</td>
                        <td class="stock-num">
                          {trimQty(line.qty)} {line.uom}
                        </td>
                        <td>
                          <select
                            class="stock-line-select"
                            value={receiveLine?.toStorageLocationId ?? ""}
                            onChange={(event) => {
                              const value = (event.currentTarget as HTMLSelectElement).value;
                              setReceiveLines((prev) =>
                                prev.map((l) =>
                                  l.lineId === line.id ? { ...l, toStorageLocationId: value } : l,
                                ),
                              );
                            }}
                            required
                            aria-label={`Receive ${line.productName} into`}
                          >
                            <option value="">Select location…</option>
                            {toLocationOptions.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name}
                                {loc.isSellable ? "" : " (unsellable)"}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div class="stock-modal-actions">
              <button type="button" disabled={busy} onClick={() => setReceiveDetail(null)} class="stock-btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy} class="stock-btn-primary">
                Confirm receipt
              </button>
            </div>
          </form>
        </DocDialog>
      ) : null}
    </section>
  );
}
