import { useEffect, useMemo, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { AUTH_TOKEN_KEY, type AuthUser } from "../auth/session.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import { validateBookletRange } from "../../shared/bookletSerial.ts";
import type {
  CreateDocumentBookletInput,
  DocumentBookletKind,
  DocumentBookletRow,
  DocumentBookletStatus,
} from "../../shared/documentBooklets.types.ts";
import "../customers/CustomersScreen.css";
import "./DocumentBookletsScreen.css";

interface SalesPointOption {
  id: number;
  name: string;
}

interface DocumentBookletsScreenProps {
  user: AuthUser;
  canWrite: boolean;
  canValidate?: boolean;
}

function IconBookOpen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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
      <polyline points="10 9 9 9 8 9" />
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

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 12h14M12 5v14" />
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

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function exportCsv(rows: DocumentBookletRow[]) {
  const headers = [
    "Document Type",
    "Booklet Code",
    "Start Serial",
    "End Serial",
    "Total Pages",
    "Used Pages",
    "Collection Point",
    "Status",
    "Issued At",
    "Issued By",
    "Validated At",
    "Validated By",
    "Notes",
  ];
  const lines = rows.map((r) => [
    r.documentKind,
    r.bookletCode || "",
    r.startSerial,
    r.endSerial,
    r.totalPages,
    r.usedPages ?? 0,
    r.salesPointName || "",
    r.status,
    r.issuedAt,
    r.issuedByUserName || "",
    r.validatedAt || "",
    r.validatedByUserName || "",
    (r.notes || "").replace(/"/g, '""'),
  ]);
  const csvContent = [
    headers.join(","),
    ...lines.map((l) => l.map((v) => `"${v}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `document-booklets-${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function DocumentBookletsScreen({
  user: _user,
  canWrite,
  canValidate = false,
}: DocumentBookletsScreenProps) {
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
  const [filterStatus, setFilterStatus] = useState<DocumentBookletStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Batch validation selection for pending booklets
  const [selectedPendingIds, setSelectedPendingIds] = useState<Set<string>>(new Set());

  // Modal: Issue Booklet
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueKind, setIssueKind] = useState<DocumentBookletKind>("SALES_INVOICE");
  const [issueSalesPointId, setIssueSalesPointId] = useState<number | null>(null);
  const [issueCode, setIssueCode] = useState("");
  const [issueStartSerial, setIssueStartSerial] = useState("");
  const [issueEndSerial, setIssueEndSerial] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [issueActivateImmediately, setIssueActivateImmediately] = useState(canValidate);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal: Reject Booklet
  const [rejectingBooklet, setRejectingBooklet] = useState<DocumentBookletRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Modal: Cancel Booklet
  const [cancellingBooklet, setCancellingBooklet] = useState<DocumentBookletRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

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
          status: filterStatus,
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
      if (issueSalesPointId == null && points.length > 0) {
        setIssueSalesPointId(points[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document booklets.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [filterKind, filterSalesPointId, filterStatus]);

  // Derived filtered booklets with search
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
      return codeMatch || serialMatch || spMatch;
    });
  }, [booklets, searchQuery]);

  const pendingBookletsInView = useMemo(
    () => displayedBooklets.filter((b) => b.status === "PENDING"),
    [displayedBooklets],
  );

  const allPendingSelected =
    pendingBookletsInView.length > 0 &&
    pendingBookletsInView.every((b) => selectedPendingIds.has(b.id));

  function toggleSelectPending(id: string) {
    setSelectedPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAllPending() {
    if (allPendingSelected) {
      setSelectedPendingIds(new Set());
    } else {
      setSelectedPendingIds(new Set(pendingBookletsInView.map((b) => b.id)));
    }
  }

  // Range preview for Issue modal
  const rangePreview = useMemo(() => {
    if (!issueStartSerial && !issueEndSerial) {
      return null;
    }
    return validateBookletRange(issueStartSerial, issueEndSerial);
  }, [issueStartSerial, issueEndSerial]);

  // Stats
  const stats = useMemo(() => {
    const pendingValidation = booklets.filter((b) => b.status === "PENDING").length;
    const activeInvoices = booklets.filter(
      (b) => b.documentKind === "SALES_INVOICE" && b.status === "ACTIVE",
    ).length;
    const activeDOs = booklets.filter(
      (b) => b.documentKind === "DELIVERY_ORDER" && b.status === "ACTIVE",
    ).length;
    const totalPages = booklets.reduce((sum, b) => sum + (b.totalPages || 0), 0);
    const totalUsed = booklets.reduce((sum, b) => sum + (b.usedPages || 0), 0);
    return { pendingValidation, activeInvoices, activeDOs, totalPages, totalUsed };
  }, [booklets]);

  async function handleCreateBooklet(e: Event) {
    e.preventDefault();
    if (!canWrite || isSubmitting) {
      return;
    }

    if (!issueSalesPointId) {
      setIssueError("Please select a collection point.");
      return;
    }

    const rangeCheck = validateBookletRange(issueStartSerial, issueEndSerial);
    if (!rangeCheck.ok) {
      setIssueError(rangeCheck.error);
      return;
    }

    setIssueError(null);
    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const input: CreateDocumentBookletInput = {
        documentKind: issueKind,
        salesPointId: issueSalesPointId,
        bookletCode: issueCode.trim() || undefined,
        startSerial: rangeCheck.startSerial,
        endSerial: rangeCheck.endSerial,
        notes: issueNotes.trim() || undefined,
        activateImmediately: canValidate ? issueActivateImmediately : false,
      };

      const result = await getElectronApi().booklets.createBooklet(token, input);
      if (!result.ok) {
        setIssueError(result.error);
        return;
      }

      setIsIssueModalOpen(false);
      setIssueCode("");
      setIssueStartSerial("");
      setIssueEndSerial("");
      setIssueNotes("");
      setIssueError(null);
      setActionMessage({
        type: "ok",
        text: `Booklet successfully issued${result.booklet.status === "ACTIVE" ? " and activated" : " (pending supervisor validation)"}.`,
      });
      await loadData();
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : "Failed to issue booklet.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleValidateSingle(booklet: DocumentBookletRow) {
    if (!canValidate) return;
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
      await loadData();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to validate booklet.",
      });
    }
  }

  async function handleBatchValidate() {
    if (!canValidate || selectedPendingIds.size === 0) return;
    setActionMessage(null);
    try {
      const token = getAuthToken();
      const ids = Array.from(selectedPendingIds);
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
      setSelectedPendingIds(new Set());
      await loadData();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to validate selected booklets.",
      });
    }
  }

  async function handleConfirmReject() {
    if (!canValidate || !rejectingBooklet || isRejecting) return;
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
      setRejectingBooklet(null);
      setRejectReason("");
      await loadData();
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : "Failed to reject booklet.");
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleConfirmCancel() {
    if (!canWrite || !cancellingBooklet || isCancelling) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    try {
      const token = getAuthToken();
      const result = await getElectronApi().booklets.cancelBooklet(
        token,
        cancellingBooklet.id,
        cancelReason.trim() || undefined,
      );

      if (!result.ok) {
        setCancelError(result.error);
        return;
      }

      setActionMessage({
        type: "ok",
        text: `Booklet "${cancellingBooklet.bookletCode || cancellingBooklet.startSerial + "–" + cancellingBooklet.endSerial}" cancelled.`,
      });
      setCancellingBooklet(null);
      setCancelReason("");
      await loadData();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel booklet.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div class="customers-screen">
      <header class="customers-screen-header">
        <div class="customers-screen-brand">
          <div class="customers-screen-brand-icon">
            <IconBookOpen />
          </div>
          <div>
            <h2 class="customers-screen-brand-title">Document Booklets</h2>
            <p class="customers-screen-brand-subtitle">
              Booklet Issuance & Serial Registry
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
          <button
            type="button"
            class="customers-btn customers-btn-secondary"
            onClick={() => exportCsv(displayedBooklets)}
            disabled={displayedBooklets.length === 0}
          >
            <IconDownload /> Export
          </button>
          {canWrite ? (
            <button
              type="button"
              class="customers-btn customers-btn-primary"
              onClick={() => {
                setIssueError(null);
                setIssueActivateImmediately(canValidate);
                setIsIssueModalOpen(true);
              }}
            >
              <IconPlus /> Issue Booklet
            </button>
          ) : null}
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
            <p class="customers-stat-value">{stats.pendingValidation}</p>
            <p class="customers-stat-label">Pending Validation</p>
          </div>
        </div>

        <div class="customers-stat-card">
          <div class="customers-stat-icon customers-stat-icon-blue">
            <IconFileText />
          </div>
          <div>
            <p class="customers-stat-value">{stats.activeInvoices}</p>
            <p class="customers-stat-label">Active Invoice Booklets</p>
          </div>
        </div>

        <div class="customers-stat-card">
          <div class="customers-stat-icon customers-stat-icon-violet">
            <IconTruck />
          </div>
          <div>
            <p class="customers-stat-value">{stats.activeDOs}</p>
            <p class="customers-stat-label">Active DO Booklets</p>
          </div>
        </div>

        <div class="customers-stat-card">
          <div class="customers-stat-icon customers-stat-icon-emerald">
            <IconLayers />
          </div>
          <div>
            <p class="customers-stat-value">{stats.totalPages.toLocaleString()}</p>
            <p class="customers-stat-label">Total Pages Issued</p>
          </div>
        </div>
      </div>

      <div class="customers-card">
        <div class="customers-card-toolbar">
          <div class="customers-card-toolbar-row">
            <div>
              <h3 class="customers-card-title">All Booklets</h3>
              <p class="customers-card-subtitle">
                {isLoading ? "Loading…" : `${displayedBooklets.length} records`}
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

              <div class="customers-tabs">
                <button
                  type="button"
                  class={`customers-tab${filterStatus === "ALL" ? " is-active" : ""}`}
                  onClick={() => setFilterStatus("ALL")}
                >
                  All
                </button>
                <button
                  type="button"
                  class={`customers-tab${filterStatus === "PENDING" ? " is-active" : ""}`}
                  onClick={() => setFilterStatus("PENDING")}
                >
                  Pending
                </button>
                <button
                  type="button"
                  class={`customers-tab${filterStatus === "ACTIVE" ? " is-active" : ""}`}
                  onClick={() => setFilterStatus("ACTIVE")}
                >
                  Active
                </button>
                <button
                  type="button"
                  class={`customers-tab${filterStatus === "CANCELLED" ? " is-active" : ""}`}
                  onClick={() => setFilterStatus("CANCELLED")}
                >
                  Cancelled
                </button>
                <button
                  type="button"
                  class={`customers-tab${filterStatus === "REJECTED" ? " is-active" : ""}`}
                  onClick={() => setFilterStatus("REJECTED")}
                >
                  Rejected
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

          {canValidate && selectedPendingIds.size > 0 ? (
            <div class="customers-selection-bar">
              <strong>{selectedPendingIds.size} pending booklet(s) selected</strong>
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
                onClick={() => setSelectedPendingIds(new Set())}
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
                {canValidate ? (
                  <th style="width: 38px;">
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      disabled={pendingBookletsInView.length === 0}
                      onChange={() => toggleSelectAllPending()}
                      title="Select all pending"
                    />
                  </th>
                ) : null}
                <th>Type</th>
                <th>Booklet Code</th>
                <th>Serial Range</th>
                <th class="is-num">Pages</th>
                <th class="is-num">Used</th>
                <th>Collection Point</th>
                <th>Status</th>
                <th>Issued / Validated</th>
                <th>Notes</th>
                <th class="customers-actions-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedBooklets.length === 0 ? (
                <tr>
                  <td
                    colSpan={canValidate ? 11 : 10}
                    class="customers-table-empty"
                  >
                    {isLoading
                      ? "Loading document booklets…"
                      : "No document booklets found matching the selected criteria."}
                  </td>
                </tr>
              ) : (
                displayedBooklets.map((b) => (
                  <tr key={b.id}>
                    {canValidate ? (
                      <td>
                        {b.status === "PENDING" ? (
                          <input
                            type="checkbox"
                            checked={selectedPendingIds.has(b.id)}
                            onChange={() => toggleSelectPending(b.id)}
                          />
                        ) : null}
                      </td>
                    ) : null}
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
                    <td class="is-num">
                      {b.usedPages ?? 0} / {b.totalPages}
                    </td>
                    <td>{b.salesPointName || `CP #${b.salesPointId}`}</td>
                    <td>
                      <span
                        class={`customers-badge ${
                          b.status === "ACTIVE"
                            ? "customers-badge-emerald"
                            : b.status === "PENDING"
                              ? "customers-badge-amber"
                              : "customers-badge-red"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <div>{formatDisplayDate(b.issuedAt)}</div>
                      {b.issuedByUserName ? (
                        <span class="customers-muted" style="font-size: 11px;">
                          issued by {b.issuedByUserName}
                        </span>
                      ) : null}
                      {b.validatedByUserName && b.validatedAt ? (
                        <div class="customers-muted" style="font-size: 11px;">
                          validated by {b.validatedByUserName} (
                          {formatDisplayDate(b.validatedAt)})
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span class="customers-muted" style="font-size: 12px;">
                        {b.notes || "—"}
                      </span>
                    </td>
                    <td class="customers-actions-col">
                      <div class="doc-booklets-action-btns">
                        {b.status === "PENDING" && canValidate ? (
                          <>
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
                          </>
                        ) : null}
                        {b.status === "ACTIVE" && canWrite ? (
                          <button
                            type="button"
                            class="customers-link-btn customers-link-btn-danger"
                            onClick={() => {
                              setCancellingBooklet(b);
                              setCancelReason("");
                              setCancelError(null);
                            }}
                          >
                            Cancel
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
      </div>

      {/* Modal: Issue Booklet */}
      {isIssueModalOpen ? (
        <FormDialog
          ariaLabel="Issue document booklet"
          title="Issue Document Booklet"
          subtitle="Assign a pre-printed serial number booklet to a collection point."
          onClose={() => {
            if (!isSubmitting) {
              setIsIssueModalOpen(false);
            }
          }}
        >
          <form
            class="doc-booklets-form"
            onSubmit={(e) => void handleCreateBooklet(e)}
          >
            {issueError ? (
              <p class="customers-banner customers-banner-error" role="alert">
                {issueError}
              </p>
            ) : null}

            <div class="doc-booklets-form-grid">
              <label class="doc-booklets-form-row">
                <span>Document Type *</span>
                <select
                  value={issueKind}
                  onChange={(e) =>
                    setIssueKind(
                      (e.currentTarget as HTMLSelectElement)
                        .value as DocumentBookletKind,
                    )
                  }
                  required
                >
                  <option value="SALES_INVOICE">Sales Invoice</option>
                  <option value="DELIVERY_ORDER">Delivery Order</option>
                </select>
              </label>

              <label class="doc-booklets-form-row">
                <span>Collection Point *</span>
                <select
                  value={issueSalesPointId ? String(issueSalesPointId) : ""}
                  onChange={(e) =>
                    setIssueSalesPointId(
                      Number((e.currentTarget as HTMLSelectElement).value),
                    )
                  }
                  required
                >
                  {salesPoints.map((sp) => (
                    <option key={sp.id} value={String(sp.id)}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label class="doc-booklets-form-row">
              <span>Booklet Code / Reference</span>
              <input
                type="text"
                placeholder="e.g. SI-BOTA-2026-01"
                value={issueCode}
                onInput={(e) =>
                  setIssueCode((e.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <div class="doc-booklets-form-grid">
              <label class="doc-booklets-form-row">
                <span>Start Serial (digits only) *</span>
                <input
                  type="text"
                  placeholder="e.g. 001001"
                  value={issueStartSerial}
                  required
                  onInput={(e) => {
                    setIssueStartSerial(
                      (e.currentTarget as HTMLInputElement).value.trim(),
                    );
                    setIssueError(null);
                  }}
                />
              </label>

              <label class="doc-booklets-form-row">
                <span>End Serial (digits only) *</span>
                <input
                  type="text"
                  placeholder="e.g. 001050"
                  value={issueEndSerial}
                  required
                  onInput={(e) => {
                    setIssueEndSerial(
                      (e.currentTarget as HTMLInputElement).value.trim(),
                    );
                    setIssueError(null);
                  }}
                />
              </label>
            </div>

            {rangePreview ? (
              <div>
                {rangePreview.ok ? (
                  <p class="doc-booklets-range-hint ok">
                    ✓ Valid range: {rangePreview.totalPages} pages (from{" "}
                    {rangePreview.startSerial} to {rangePreview.endSerial})
                  </p>
                ) : (
                  <p class="doc-booklets-range-hint err">
                    ⚠ {rangePreview.error}
                  </p>
                )}
              </div>
            ) : null}

            {canValidate ? (
              <label class="doc-booklets-checkbox-label">
                <input
                  type="checkbox"
                  checked={issueActivateImmediately}
                  onChange={(e) =>
                    setIssueActivateImmediately(
                      (e.currentTarget as HTMLInputElement).checked,
                    )
                  }
                />
                <span>Validate and activate immediately</span>
              </label>
            ) : (
              <div class="doc-booklets-info-box">
                ℹ Booklet issuance will be submitted as <strong>Pending</strong>{" "}
                and must be validated by a supervisor before its serial numbers can
                be used.
              </div>
            )}

            <label class="doc-booklets-form-row">
              <span>Notes / Observations</span>
              <textarea
                rows={2}
                placeholder="Optional notes regarding this booklet issuance…"
                value={issueNotes}
                onInput={(e) =>
                  setIssueNotes(
                    (e.currentTarget as HTMLTextAreaElement).value,
                  )
                }
              />
            </label>

            <div class="doc-booklets-modal-actions">
              <button
                type="button"
                class="customers-btn customers-btn-secondary"
                disabled={isSubmitting}
                onClick={() => setIsIssueModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                class="customers-btn customers-btn-primary"
                disabled={
                  isSubmitting || (rangePreview ? !rangePreview.ok : true)
                }
              >
                {isSubmitting ? "Issuing…" : "Issue Booklet"}
              </button>
            </div>
          </form>
        </FormDialog>
      ) : null}

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

      {/* Modal: Cancel Booklet */}
      {cancellingBooklet ? (
        <FormDialog
          ariaLabel="Cancel document booklet"
          title="Cancel Document Booklet"
          subtitle={`Are you sure you want to cancel booklet ${
            cancellingBooklet.bookletCode ||
            cancellingBooklet.startSerial + "–" + cancellingBooklet.endSerial
          }?`}
          onClose={() => {
            if (!isCancelling) {
              setCancellingBooklet(null);
            }
          }}
        >
          <div class="doc-booklets-form">
            {cancelError ? (
              <p class="customers-banner customers-banner-error" role="alert">
                {cancelError}
              </p>
            ) : null}

            <p class="doc-booklets-warn-text">
              Cancelling this booklet will prevent any future sales invoices or
              delivery orders from using serials within this range. Already
              registered documents will remain intact.
            </p>

            <label class="doc-booklets-form-row">
              <span>Reason for Cancellation</span>
              <textarea
                rows={2}
                placeholder="e.g. Booklet damaged, misprinted, or lost…"
                value={cancelReason}
                onInput={(e) =>
                  setCancelReason(
                    (e.currentTarget as HTMLTextAreaElement).value,
                  )
                }
              />
            </label>

            <div class="doc-booklets-modal-actions">
              <button
                type="button"
                class="customers-btn customers-btn-secondary"
                disabled={isCancelling}
                onClick={() => setCancellingBooklet(null)}
              >
                Keep Active
              </button>
              <button
                type="button"
                class="customers-btn customers-btn-danger"
                disabled={isCancelling}
                onClick={() => void handleConfirmCancel()}
              >
                {isCancelling ? "Cancelling…" : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
