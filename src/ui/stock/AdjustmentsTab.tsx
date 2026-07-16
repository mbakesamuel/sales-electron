import { useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import type {
  AdjustmentDetail,
  AdjustmentListRow,
  ProductOption,
  SalesPointOption,
  StockBalanceRow,
  StorageLocationOption,
} from "../../shared/stock.types.ts";
import { ConfirmDialog, DocDialog, ReviewKeyValue, ReviewLineTable, StatusBadge } from "./StockDialogs.tsx";
import { AdjustmentLineEditor, type AdjustmentLineDraft } from "./LineEditors.tsx";
import { defaultLocationId, formatDate, formatDateTime, locationsForSalesPoint, utcIsoDateToday } from "./stockUtils.ts";

interface AdjustmentsTabProps {
  rows: AdjustmentListRow[];
  salesPoints: SalesPointOption[];
  storageLocations: StorageLocationOption[];
  products: ProductOption[];
  onHand: StockBalanceRow[];
  scopedSalesPointId: number | null;
  canPost: boolean;
  canReclassify: boolean;
  canCancel: boolean;
  canDraft: boolean;
  userId: string;
  onOk: (text: string) => void;
  onErr: (text: string) => void;
}

function lineModeFromDetail(detail: AdjustmentDetail): "ADJUST" | "RECLASSIFY" {
  return detail.lines.some((line) => line.fromCondition && line.toCondition)
    ? "RECLASSIFY"
    : "ADJUST";
}

export function AdjustmentsTab(props: AdjustmentsTabProps) {
  const { rows, salesPoints, storageLocations, products, onHand, scopedSalesPointId, userId } = props;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [salesPointId, setSalesPointId] = useState<string>(
    scopedSalesPointId != null ? String(scopedSalesPointId) : "",
  );
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"ADJUST" | "RECLASSIFY">("ADJUST");
  const [occurredAt, setOccurredAt] = useState(utcIsoDateToday());
  const [lines, setLines] = useState<AdjustmentLineDraft[]>(() => [
    {
      productId: "",
      deltaQty: "",
      storageLocationId: defaultLocationId(storageLocations, scopedSalesPointId ?? ""),
      fromCondition: "SELLABLE",
      toCondition: "UNSELLABLE",
    },
  ]);
  const [pendingCancel, setPendingCancel] = useState<AdjustmentListRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [lookupNo, setLookupNo] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [reviewDetail, setReviewDetail] = useState<AdjustmentDetail | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  function resetForm() {
    setEditingId(null);
    const sp = scopedSalesPointId != null ? String(scopedSalesPointId) : "";
    setSalesPointId(sp);
    setReason("");
    setMode("ADJUST");
    setOccurredAt(utcIsoDateToday());
    setLines([
      {
        productId: "",
        deltaQty: "",
        storageLocationId: defaultLocationId(storageLocations, sp),
        fromCondition: "SELLABLE",
        toCondition: "UNSELLABLE",
      },
    ]);
  }

  function onSalesPointChange(nextId: string) {
    setSalesPointId(nextId);
    const defLoc = defaultLocationId(storageLocations, nextId);
    setLines((prev) =>
      prev.map((l) => ({
        ...l,
        storageLocationId: locationsForSalesPoint(storageLocations, nextId).some(
          (loc) => String(loc.id) === l.storageLocationId,
        )
          ? l.storageLocationId
          : defLoc,
      })),
    );
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function populateFormFromDetail(detail: AdjustmentDetail) {
    const detailMode = lineModeFromDetail(detail);
    setEditingId(detail.id);
    setSalesPointId(String(detail.salesPointId));
    setReason(detail.reason);
    setMode(detailMode);
    setOccurredAt(
      detail.occurredAtIso.length > 10 ? detail.occurredAtIso.slice(0, 10) : detail.occurredAtIso,
    );
    setLines(
      detail.lines.length > 0
        ? detail.lines.map((line) => ({
            productId: String(line.productId),
            deltaQty: line.deltaQty,
            storageLocationId: String(line.storageLocationId),
            fromCondition: line.fromCondition ?? "SELLABLE",
            toCondition: line.toCondition ?? "UNSELLABLE",
          }))
        : [
            {
              productId: "",
              deltaQty: "",
              storageLocationId: defaultLocationId(storageLocations, detail.salesPointId),
              fromCondition: "SELLABLE",
              toCondition: "UNSELLABLE",
            },
          ],
    );
    setOpen(true);
  }

  async function onSave(event: Event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await getElectronApi().stock.saveAdjustment({
        userId,
        id: editingId,
        salesPointId: Number.parseInt(salesPointId, 10),
        reason,
        occurredAt,
        lines: lines
          .filter((l) => l.productId && l.deltaQty && l.storageLocationId)
          .map((l) => ({
            productId: Number.parseInt(l.productId, 10),
            deltaQty: l.deltaQty,
            storageLocationId: Number.parseInt(l.storageLocationId, 10),
            ...(mode === "RECLASSIFY" && props.canReclassify
              ? {
                  fromCondition: l.fromCondition ?? "SELLABLE",
                  toCondition: l.toCondition ?? "UNSELLABLE",
                }
              : {}),
          })),
      });
      if (res.ok) {
        props.onOk(
          editingId
            ? `Adjustment ${res.documentNo} updated.`
            : `Adjustment ${res.documentNo} drafted.`,
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
      const res = await getElectronApi().stock.postAdjustment({ userId, adjustmentId: id });
      if (res.ok) {
        props.onOk("Adjustment posted; balances updated.");
        if (reviewDetail?.id === id) setReviewDetail(null);
      } else {
        props.onErr(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!pendingCancel) return;
    const id = pendingCancel.id;
    setPendingCancel(null);
    setBusy(true);
    try {
      const res = await getElectronApi().stock.cancelAdjustment({ userId, adjustmentId: id });
      if (res.ok) {
        props.onOk("Adjustment cancelled.");
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
      const res = await getElectronApi().stock.loadAdjustmentForReview({ userId, adjustmentId: id });
      if (res.ok) setReviewDetail(res.detail);
      else props.onErr(res.error);
    } finally {
      setReviewBusy(false);
    }
  }

  async function openEditById(id: string) {
    setReviewBusy(true);
    try {
      const res = await getElectronApi().stock.loadAdjustmentForReview({ userId, adjustmentId: id });
      if (res.ok) {
        if (res.detail.status !== "DRAFT") {
          props.onErr("Only draft adjustments can be edited.");
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
      const res = await getElectronApi().stock.findAdjustmentByNumber({ userId, adjustmentNo: n });
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

  const canCreate = props.canDraft && (props.canPost || props.canReclassify);

  return (
    <section class="stock-section">
      <div class="stock-section-header">
        <div>
          <h2>Stock adjustments</h2>
          {props.canPost ? (
            <p class="stock-hint">
              Pull a draft voucher by its number to cross-check the lines before posting.
            </p>
          ) : (
            <p class="stock-hint">
              Draft an adjustment, then submit it to your supervisor for posting.
            </p>
          )}
        </div>
        <div class="stock-header-actions">
          {props.canPost ? (
            <form onSubmit={onLookup} class="stock-lookup-row" aria-label="Pull voucher by number">
              <input
                value={lookupNo}
                onInput={(event) => setLookupNo((event.currentTarget as HTMLInputElement).value)}
                placeholder="SA-2026-000001"
                class="stock-lookup-input"
                aria-label="Adjustment number"
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
          {canCreate ? (
            <button type="button" class="stock-btn-primary" onClick={openCreate}>
              New adjustment
            </button>
          ) : null}
        </div>
      </div>

      <div class="stock-table-wrap">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Adjustment #</th>
              <th>Date</th>
              <th>Sales point</th>
              <th>Reason</th>
              <th class="stock-num">Lines</th>
              <th>Status</th>
              <th>Created by</th>
              <th>Posted by</th>
              <th class="stock-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} class="stock-empty-cell">
                  No adjustments recorded yet.
                  {canCreate ? (
                    <>
                      {" "}
                      Use <span class="stock-strong">New adjustment</span> to create one.
                    </>
                  ) : null}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td class="stock-mono">{r.adjustmentNo}</td>
                  <td class="stock-nowrap">{formatDate(r.occurredAtIso)}</td>
                  <td>{r.salesPointName}</td>
                  <td>{r.reason}</td>
                  <td class="stock-num">{r.lineCount}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td class="stock-muted">
                    <div>{r.createdByName}</div>
                    <div class="stock-subtext">{formatDateTime(r.createdAtIso)}</div>
                  </td>
                  <td class="stock-muted">
                    {r.postedByName ? (
                      <>
                        <div>{r.postedByName}</div>
                        <div class="stock-subtext">{formatDateTime(r.postedAtIso)}</div>
                      </>
                    ) : (
                      "—"
                    )}
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
                    {r.status === "DRAFT" && props.canDraft ? (
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
                    {r.status === "DRAFT" && props.canPost ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onPost(r.id)}
                        class="stock-btn-primary stock-btn-small"
                      >
                        Post
                      </button>
                    ) : null}
                    {r.status === "DRAFT" || (r.status === "POSTED" && props.canCancel) ? (
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {reviewDetail ? (
        <DocDialog
          title={`Review adjustment ${reviewDetail.adjustmentNo}`}
          wide
          onClose={() => setReviewDetail(null)}
        >
          <div class="stock-review">
            <div class="stock-review-top">
              <StatusBadge status={reviewDetail.status} />
            </div>

            <div class="stock-review-grid">
              <ReviewKeyValue label="Sales point">{reviewDetail.salesPointName}</ReviewKeyValue>
              <ReviewKeyValue label="Date">{formatDate(reviewDetail.occurredAtIso)}</ReviewKeyValue>
              <ReviewKeyValue label="Reason">{reviewDetail.reason}</ReviewKeyValue>
              <ReviewKeyValue label="Drafted by">
                {reviewDetail.createdByName}
                <span class="stock-subtext"> {formatDateTime(reviewDetail.createdAtIso)}</span>
              </ReviewKeyValue>
              {reviewDetail.postedByName ? (
                <ReviewKeyValue label="Posted by">
                  {reviewDetail.postedByName}
                  <span class="stock-subtext"> {formatDateTime(reviewDetail.postedAtIso)}</span>
                </ReviewKeyValue>
              ) : null}
            </div>

            <ReviewLineTable
              lines={reviewDetail.lines.map((line) => ({
                productName: line.productName,
                uom: line.uom,
                qty: line.deltaQty,
                deltaQty: line.deltaQty,
                storageLocationName: line.storageLocationName,
              }))}
              qtyHeader="Delta qty"
            />

            <div class="stock-modal-actions">
              <button type="button" class="stock-btn-secondary" onClick={() => setReviewDetail(null)}>
                Close
              </button>
              {reviewDetail.status === "DRAFT" || (reviewDetail.status === "POSTED" && props.canCancel) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingCancel(reviewDetail)}
                  class="stock-btn-danger"
                >
                  {reviewDetail.status === "DRAFT" ? "Delete draft" : "Cancel adjustment"}
                </button>
              ) : null}
              {reviewDetail.status === "DRAFT" && props.canDraft ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void openEditById(reviewDetail.id)}
                  class="stock-btn-secondary"
                  title="Correct the draft before posting"
                >
                  Edit draft
                </button>
              ) : null}
              {reviewDetail.status === "DRAFT" && props.canPost ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onPost(reviewDetail.id)}
                  class="stock-btn-primary"
                >
                  Post adjustment
                </button>
              ) : null}
            </div>
          </div>
        </DocDialog>
      ) : null}

      {open ? (
        <DocDialog title={editingId ? "Edit adjustment" : "New adjustment"} wide onClose={() => setOpen(false)}>
          <form onSubmit={onSave} class="stock-form">
            {scopedSalesPointId == null ? (
              <label class="stock-form-row">
                <span class="stock-form-label">Sales point</span>
                <select
                  class="stock-form-control"
                  value={salesPointId}
                  onChange={(event) => onSalesPointChange((event.currentTarget as HTMLSelectElement).value)}
                  required
                >
                  <option value="">Select…</option>
                  {salesPoints.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label class="stock-form-row">
              <span class="stock-form-label">Date</span>
              <input
                type="date"
                class="stock-form-control"
                value={occurredAt}
                onInput={(event) => setOccurredAt((event.currentTarget as HTMLInputElement).value)}
                required
              />
            </label>
            <label class="stock-form-row">
              <span class="stock-form-label">Reason</span>
              <input
                class="stock-form-control"
                value={reason}
                onInput={(event) => setReason((event.currentTarget as HTMLInputElement).value)}
                placeholder="e.g. monthly inventory count"
                required
              />
            </label>

            <div class="stock-form-row">
              <span class="stock-form-label">Mode</span>
              <div class="stock-form-control-wrap">
                {props.canReclassify ? (
                  <>
                    <select
                      class="stock-form-control"
                      value={mode}
                      onChange={(event) =>
                        setMode((event.currentTarget as HTMLSelectElement).value as "ADJUST" | "RECLASSIFY")
                      }
                    >
                      <option value="ADJUST">Adjust (+/-)</option>
                      <option value="RECLASSIFY">Reclassify sellable ↔ unsellable</option>
                    </select>
                    <p class="stock-hint">
                      Reclassify moves quantity between sellable and unsellable within the same
                      location. Managers only.
                    </p>
                  </>
                ) : (
                  <p class="stock-hint">Adjust (+/-) quantity at a storage location.</p>
                )}
              </div>
            </div>

            <AdjustmentLineEditor
              products={products}
              lines={lines}
              onChange={setLines}
              locationOptions={locationsForSalesPoint(storageLocations, salesPointId)}
              defaultLocationId={defaultLocationId(storageLocations, salesPointId)}
              mode={mode}
              onHand={onHand}
              salesPointId={salesPointId}
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
          title={pendingCancel.status === "DRAFT" ? "Delete this adjustment?" : "Cancel posted adjustment?"}
          description={
            pendingCancel.status === "DRAFT"
              ? `Draft adjustment ${pendingCancel.adjustmentNo} will be removed.`
              : `Adjustment ${pendingCancel.adjustmentNo} is posted. Cancelling writes compensating movements that reverse every line.`
          }
          confirmLabel={pendingCancel.status === "DRAFT" ? "Delete" : "Cancel adjustment"}
          busy={busy}
          onCancel={() => setPendingCancel(null)}
          onConfirm={onCancel}
        />
      ) : null}
    </section>
  );
}
