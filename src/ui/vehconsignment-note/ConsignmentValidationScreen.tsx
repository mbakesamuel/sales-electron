import { useEffect, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { SaleDisposition } from "../../shared/sales.types.ts";
import type {
  ConsignmentValidationQueuePage,
  ConsignmentValidationQueueRow,
  LoadedConsignmentFormView,
} from "../../shared/vehicleConsignmentNotes.types.ts";
import type { AuthUser } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import { ConsignmentNotePrintView } from "./VcnPrintView.tsx";
import "./VcnPrintView.css";
import "../sales/sales.css";

interface ConsignmentValidationScreenProps {
  user: AuthUser;
}

function dispositionLabel(disposition: SaleDisposition | null): string {
  if (disposition === "RATION") {
    return "Ration";
  }
  if (disposition === "PUBLIC_RELATION") {
    return "Public relation";
  }
  if (disposition === "NORMAL") {
    return "Normal";
  }
  return "—";
}

export function ConsignmentValidationScreen({
  user,
}: ConsignmentValidationScreenProps) {
  const [page, setPage] = useState<ConsignmentValidationQueuePage | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [review, setReview] = useState<LoadedConsignmentFormView | null>(null);
  const [printNoteId, setPrintNoteId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  async function refresh() {
    setPage(await getElectronApi().vehicleConsignmentNotes.listValidationQueue(user.id));
  }

  useEffect(() => {
    void refresh().catch((error) => {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not load consignment validation queue.",
      });
    });
  }, [user.id]);

  const selectedIds =
    page?.rows.filter((row) => selected[row.id]).map((row) => row.id) ?? [];

  const allChecked =
    page != null &&
    page.rows.length > 0 &&
    page.rows.every((row) => selected[row.id]);

  async function validateIds(noteIds: string[]) {
    if (noteIds.length === 0) {
      setMessage({ type: "error", text: "Select at least one consignment note." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await getElectronApi().vehicleConsignmentNotes.validateMany({
        userId: user.id,
        noteIds,
      });
      if (result.ok === false) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      const errorText =
        result.errors.length > 0
          ? ` · ${result.errors.length} failed${
              result.errors[0]
                ? `: ${result.errors[0].consignmentNoteNo ?? ""} ${result.errors[0].error}`.trim()
                : ""
            }`
          : "";
      setMessage({
        type: "ok",
        text: `Validated ${result.validated} consignment note(s)${errorText}.`,
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

  async function openReview(row: ConsignmentValidationQueueRow) {
    setReviewBusy(true);
    setMessage(null);
    try {
      const detail = await getElectronApi().vehicleConsignmentNotes.loadByVcnNo(
        row.consignmentNoteNo,
      );
      if (!detail?.note) {
        setMessage({ type: "error", text: "Consignment note not found." });
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
            <h3>Consignment validation</h3>
            <p class="sales-muted">
              Pending vehicle consignment notes awaiting validation.
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
                  <th>VCN #</th>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Collection point</th>
                  <th>Customer</th>
                  <th>Destination</th>
                  <th>Disposition</th>
                  <th>Drafted by</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} class="sales-empty">
                      No consignment notes are awaiting validation.
                    </td>
                  </tr>
                ) : (
                  page.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(selected[row.id])}
                          aria-label={`Select ${row.consignmentNoteNo}`}
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
                      <td>{row.consignmentNoteNo}</td>
                      <td>{row.invoiceNo}</td>
                      <td>{formatDisplayDate(row.dateOfConsignment)}</td>
                      <td>{row.salesPointName ?? "—"}</td>
                      <td>{row.customerName}</td>
                      <td>{row.destination}</td>
                      <td>{dispositionLabel(row.saleDisposition)}</td>
                      <td>{row.createdByName}</td>
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

      {review?.note ? (
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
                Review consignment note {review.note.consignmentNoteNo}
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
                Invoice {review.sale.invoiceNo}
                {" · "}
                {review.sale.customerName}
                {" · "}
                {review.sale.salesPointName ?? "No collection point"}
                {" · "}
                {formatDisplayDate(review.note.dateOfConsignment)}
                {" · "}
                {dispositionLabel(review.sale.saleDisposition)}
              </p>
              <p class="sales-muted">
                Destination: {review.note.destination}
                {" · Vehicle: "}
                {review.note.vehicleNumber}
                {" · Receiver: "}
                {review.note.receiverName}
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
                  class="sales-btn-secondary"
                  onClick={() => setPrintNoteId(review.note!.id)}
                >
                  View / print
                </button>
                <button
                  type="button"
                  class="sales-btn-primary"
                  disabled={busy || review.note.status !== "PENDING"}
                  onClick={() => void validateIds([review.note!.id])}
                >
                  {busy ? "Validating…" : "Validate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {printNoteId ? (
        <ConsignmentNotePrintView
          noteId={printNoteId}
          onClose={() => setPrintNoteId(null)}
        />
      ) : null}
    </div>
  );
}
