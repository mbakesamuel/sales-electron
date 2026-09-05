import { useEffect, useMemo, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { AUTH_TOKEN_KEY, type AuthUser } from "../auth/session.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type {
  DocumentBookletKind,
  DocumentBookletRow,
} from "../../shared/documentBooklets.types.ts";
import "../customers/CustomersScreen.css";
import "./DocumentBookletsScreen.css";

interface SalesPointOption {
  id: number;
  name: string;
}

interface BookletValidationScreenProps {
  user: AuthUser;
}

function IconFileCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export function BookletValidationScreen({ user: _user }: BookletValidationScreenProps) {
  const [booklets, setBooklets] = useState<DocumentBookletRow[]>([]);
  const [salesPoints, setSalesPoints] = useState<SalesPointOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  // Filters
  const [filterKind, setFilterKind] = useState<DocumentBookletKind | "ALL">("ALL");
  const [filterSalesPointId, setFilterSalesPointId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal: Reject
  const [rejectingBooklet, setRejectingBooklet] = useState<DocumentBookletRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  function getAuthToken(): string {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) ?? "";
  }

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const api = getElectronApi();
      const db = getAuthenticatedDb();

      const [bookletsRes, spRes] = await Promise.all([
        api.booklets.listBooklets(token, {
          documentKind: filterKind,
          salesPointId: filterSalesPointId === "ALL" ? "ALL" : Number(filterSalesPointId),
          status: "PENDING",
        }),
        db.queryTable({ table: "SalesPoint", limit: 200 }),
      ]);

      setBooklets(bookletsRes);
      const points = spRes.rows
        .map((r) => ({
          id: Number(r.id),
          name: String(r.name ?? ""),
          isActive: Number(r.isActive ?? 1) !== 0,
        }))
        .filter((r) => r.isActive)
        .sort((a, b) => a.name.localeCompare(b.name));

      setSalesPoints(points);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending booklets.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [filterKind, filterSalesPointId]);

  const displayedBooklets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return booklets;
    }
    return booklets.filter((b) => {
      const codeMatch = b.bookletCode?.toLowerCase().includes(q) ?? false;
      const serialMatch =
        b.startSerial.includes(q) ||
        b.endSerial.includes(q) ||
        `${b.startSerial}-${b.endSerial}`.includes(q);
      const spMatch = b.salesPointName?.toLowerCase().includes(q) ?? false;
      const userMatch = b.issuedByUserName?.toLowerCase().includes(q) ?? false;
      return codeMatch || serialMatch || spMatch || userMatch;
    });
  }, [booklets, searchQuery]);

  const allSelected =
    displayedBooklets.length > 0 &&
    displayedBooklets.every((b) => selectedIds.has(b.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedBooklets.map((b) => b.id)));
    }
  }

  const stats = useMemo(() => {
    const totalPending = booklets.length;
    const pendingInvoices = booklets.filter(
      (b) => b.documentKind === "SALES_INVOICE",
    ).length;
    const pendingDOs = booklets.filter(
      (b) => b.documentKind === "DELIVERY_ORDER",
    ).length;
    const totalPages = booklets.reduce((sum, b) => sum + (b.totalPages || 0), 0);
    return { totalPending, pendingInvoices, pendingDOs, totalPages };
  }, [booklets]);

  async function handleValidateSingle(booklet: DocumentBookletRow) {
    setActionMessage(null);
    try {
      const token = getAuthToken();
      const result = await getElectronApi().booklets.validateBooklet(token, booklet.id);
      if (!result.ok) {
        setActionMessage({ type: "error", text: result.error });
        return;
      }
      setActionMessage({
        type: "ok",
        text: `Booklet "${booklet.bookletCode || booklet.startSerial + "–" + booklet.endSerial}" validated and activated.`,
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(booklet.id);
        return next;
      });
      await loadData();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to validate booklet.",
      });
    }
  }

  async function handleBatchValidate() {
    if (selectedIds.size === 0) return;
    setActionMessage(null);
    try {
      const token = getAuthToken();
      const ids = Array.from(selectedIds);
      const result = await getElectronApi().booklets.validateManyBooklets(token, ids);
      if (!result.ok && result.error) {
        setActionMessage({ type: "error", text: result.error });
        return;
      }
      const errorMsg =
        result.errors.length > 0
          ? ` (${result.errors.length} failed: ${result.errors[0]?.error ?? ""})`
          : "";
      setActionMessage({
        type: result.errors.length === 0 ? "ok" : "error",
        text: `Validated ${result.validated} booklet(s)${errorMsg}.`,
      });
      setSelectedIds(new Set());
      await loadData();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to validate selected booklets.",
      });
    }
  }

  async function handleConfirmReject() {
    if (!rejectingBooklet || isRejecting) return;
    setIsRejecting(true);
    setRejectError(null);
    try {
      const token = getAuthToken();
      const result = await getElectronApi().booklets.rejectBooklet(
        token,
        rejectingBooklet.id,
        rejectReason.trim() || undefined,
      );
      if (!result.ok) {
        setRejectError(result.error);
        return;
      }
      setActionMessage({
        type: "ok",
        text: `Booklet "${rejectingBooklet.bookletCode || rejectingBooklet.startSerial + "–" + rejectingBooklet.endSerial}" was rejected.`,
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(rejectingBooklet.id);
        return next;
      });
      setRejectingBooklet(null);
      setRejectReason("");
      await loadData();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Failed to reject booklet.");
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div class="customers-screen">
      <header class="customers-screen-header">
        <div class="customers-screen-brand">
          <div class="customers-screen-brand-icon">
            <IconFileCheck />
          </div>
          <div>
            <h2 class="customers-screen-brand-title">Booklet Validation</h2>
            <p class="customers-screen-brand-subtitle">
              Review and validate pending document booklet issuances
            </p>
          </div>
        </div>

        <div class="customers-screen-header-actions">
          <button
            type="button"
            class="customers-btn customers-btn-secondary"
            onClick={() => void loadData()}
            disabled={isLoading}
          >
            <IconRefresh /> Refresh
          </button>
        </div>
      </header>

      {error ? (
        <p class="customers-banner customers-banner-error">{error}</p>
      ) : null}

      {actionMessage ? (
        <p
          class={`customers-banner ${
            actionMessage.type === "ok"
              ? "doc-booklets-range-hint ok"
              : "customers-banner-error"
          }`}
        >
          {actionMessage.text}
        </p>
      ) : null}

      <div class="customers-stats">
        <div class="customers-stat-card">
          <div class="customers-stat-icon customers-stat-icon-amber">
            <IconClock />
          </div>
          <div>
            <p class="customers-stat-value">{stats.totalPending}</p>
            <p class="customers-stat-label">Pending Total</p>
          </div>
        </div>

        <div class="customers-stat-card">
          <div class="customers-stat-icon customers-stat-icon-blue">
            <IconFileText />
          </div>
          <div>
            <p class="customers-stat-value">{stats.pendingInvoices}</p>
            <p class="customers-stat-label">Pending Invoices</p>
          </div>
        </div>

        <div class="customers-stat-card">
          <div class="customers-stat-icon customers-stat-icon-violet">
            <IconTruck />
          </div>
          <div>
            <p class="customers-stat-value">{stats.pendingDOs}</p>
            <p class="customers-stat-label">Pending Delivery Orders</p>
          </div>
        </div>

        <div class="customers-stat-card">
          <div class="customers-stat-icon customers-stat-icon-emerald">
            <IconLayers />
          </div>
          <div>
            <p class="customers-stat-value">{stats.totalPages.toLocaleString()}</p>
            <p class="customers-stat-label">Total Pages in Queue</p>
          </div>
        </div>
      </div>

      <div class="customers-card">
        <div class="customers-card-toolbar">
          <div class="customers-card-toolbar-row">
            <div>
              <h3 class="customers-card-title">Pending Validation Queue</h3>
              <p class="customers-card-subtitle">
                {isLoading ? "Loading…" : `${displayedBooklets.length} booklet(s) awaiting review`}
              </p>
            </div>

            <div class="customers-card-controls">
              <div class="customers-tabs">
                <button
                  type="button"
                  class={`customers-tab${filterKind === "ALL" ? " is-active" : ""}`}
                  onClick={() => setFilterKind("ALL")}
                >
                  All Types
                </button>
                <button
                  type="button"
                  class={`customers-tab${filterKind === "SALES_INVOICE" ? " is-active" : ""}`}
                  onClick={() => setFilterKind("SALES_INVOICE")}
                >
                  Invoices
                </button>
                <button
                  type="button"
                  class={`customers-tab${filterKind === "DELIVERY_ORDER" ? " is-active" : ""}`}
                  onClick={() => setFilterKind("DELIVERY_ORDER")}
                >
                  Delivery Orders
                </button>
              </div>

              <select
                class="doc-booklets-select"
                value={filterSalesPointId}
                onChange={(e) =>
                  setFilterSalesPointId((e.currentTarget as HTMLSelectElement).value)
                }
              >
                <option value="ALL">All Collection Points</option>
                {salesPoints.map((sp) => (
                  <option key={sp.id} value={String(sp.id)}>
                    {sp.name}
                  </option>
                ))}
              </select>

              <div class="customers-search-wrap">
                <IconSearch />
                <input
                  class="customers-search"
                  type="search"
                  placeholder="Search code, serial, CP…"
                  value={searchQuery}
                  onInput={(e) =>
                    setSearchQuery((e.currentTarget as HTMLInputElement).value)
                  }
                />
              </div>
            </div>
          </div>

          {selectedIds.size > 0 ? (
            <div class="customers-selection-bar">
              <strong>{selectedIds.size} pending booklet(s) selected</strong>
              <button
                type="button"
                class="customers-link-btn customers-link-btn-primary"
                onClick={() => void handleBatchValidate()}
              >
                Validate selected
              </button>
              <button
                type="button"
                class="customers-link-btn customers-link-btn-muted"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        <div class="customers-table-scroll">
          <table class="customers-table">
            <thead>
              <tr>
                <th style="width: 38px;">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={displayedBooklets.length === 0}
                    onChange={() => toggleSelectAll()}
                    title="Select all"
                  />
                </th>
                <th>Type</th>
                <th>Booklet Code</th>
                <th>Serial Range</th>
                <th class="is-num">Pages</th>
                <th>Collection Point</th>
                <th>Status</th>
                <th>Issued By</th>
                <th>Notes</th>
                <th class="customers-actions-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedBooklets.length === 0 ? (
                <tr>
                  <td colSpan={10} class="customers-table-empty">
                    {isLoading
                      ? "Loading pending booklets…"
                      : "No booklets currently awaiting validation."}
                  </td>
                </tr>
              ) : (
                displayedBooklets.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(b.id)}
                        onChange={() => toggleSelect(b.id)}
                      />
                    </td>
                    <td>
                      <span
                        class={`customers-badge ${
                          b.documentKind === "SALES_INVOICE"
                            ? "customers-badge-blue"
                            : "customers-badge-violet"
                        }`}
                      >
                        {b.documentKind === "SALES_INVOICE"
                          ? "Invoice"
                          : "Delivery Order"}
                      </span>
                    </td>
                    <td>
                      <span class="customers-mono-chip">
                        {b.bookletCode || "—"}
                      </span>
                    </td>
                    <td>
                      <span class="customers-mono-chip">
                        {b.startSerial} – {b.endSerial}
                      </span>
                    </td>
                    <td class="is-num">{b.totalPages}</td>
                    <td>{b.salesPointName || `CP #${b.salesPointId}`}</td>
                    <td>
                      <span class="customers-badge customers-badge-amber">
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <div>{formatDisplayDate(b.issuedAt)}</div>
                      {b.issuedByUserName ? (
                        <span class="customers-muted" style="font-size: 11px;">
                          by {b.issuedByUserName}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span class="customers-muted" style="font-size: 12px;">
                        {b.notes || "—"}
                      </span>
                    </td>
                    <td class="customers-actions-col">
                      <div class="doc-booklets-action-btns">
                        <button
                          type="button"
                          class="customers-link-btn customers-link-btn-primary"
                          onClick={() => void handleValidateSingle(b)}
                        >
                          Validate
                        </button>
                        <button
                          type="button"
                          class="customers-link-btn customers-link-btn-danger"
                          onClick={() => {
                            setRejectingBooklet(b);
                            setRejectReason("");
                            setRejectError(null);
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Reject Booklet */}
      {rejectingBooklet ? (
        <FormDialog
          ariaLabel="Reject document booklet"
          title="Reject Document Booklet"
          subtitle={`Reject issuance of booklet ${
            rejectingBooklet.bookletCode ||
            rejectingBooklet.startSerial + "–" + rejectingBooklet.endSerial
          }?`}
          onClose={() => {
            if (!isRejecting) {
              setRejectingBooklet(null);
            }
          }}
        >
          <div class="doc-booklets-form">
            {rejectError ? (
              <p class="customers-banner customers-banner-error" role="alert">
                {rejectError}
              </p>
            ) : null}

            <p class="doc-booklets-warn-text">
              Rejecting this booklet issuance will flag it as rejected and prevent
              the serial range from being activated.
            </p>

            <label class="doc-booklets-form-row">
              <span>Reason for Rejection</span>
              <textarea
                rows={2}
                placeholder="e.g. Serial range already allocated on physical paper, wrong collection point…"
                value={rejectReason}
                onInput={(e) =>
                  setRejectReason(
                    (e.currentTarget as HTMLTextAreaElement).value,
                  )
                }
              />
            </label>

            <div class="doc-booklets-modal-actions">
              <button
                type="button"
                class="customers-btn customers-btn-secondary"
                disabled={isRejecting}
                onClick={() => setRejectingBooklet(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                class="customers-btn customers-btn-danger"
                disabled={isRejecting}
                onClick={() => void handleConfirmReject()}
              >
                {isRejecting ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
