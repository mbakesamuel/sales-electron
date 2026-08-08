import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { formatDisplayDate as formatDate } from "../../shared/formatDisplayDate.ts";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";

import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";
import { ProductUnitPriceFormModal } from "./ProductUnitPriceFormModal.tsx";
import type { TableSchema } from "../types/electron.d.ts";
import "../customers/CustomersScreen.css";

type SortKey =
  | "productLabel"
  | "unitPriceExTax"
  | "effectiveFrom"
  | "customerTypeLabel"
  | "createdAt";

type SortDir = "asc" | "desc";
type ActiveTab = "all" | "Direct" | string;

interface UnitPriceRow {
  id: string;
  productId: number;
  productLabel: string;
  productCode: string;
  unitPriceExTax: string;
  unitPriceNumeric: number;
  effectiveFrom: string;
  customerTypeId: string | null;
  customerTypeLabel: string;
  createdAt: string;
  updatedAt: string;
  raw: Record<string, unknown>;
}

type FormState = { mode: "create" } | { mode: "edit"; row: Record<string, unknown> };

const PAGE_SIZE = 6;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPrice(value: string): string {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value || "—";
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function typeBadgeClass(label: string): string {
  if (label === "Direct") return "customers-badge customers-badge-slate";
  const normalized = label.toLowerCase();
  if (normalized === "industry") return "customers-badge customers-badge-slate";
  if (normalized === "wholesale") return "customers-badge customers-badge-violet";
  if (normalized === "retail") return "customers-badge customers-badge-blue";
  return "customers-badge customers-badge-blue";
}

function matchesTab(row: UnitPriceRow, tab: ActiveTab): boolean {
  if (tab === "all") return true;
  if (tab === "Direct") return !row.customerTypeId;
  return row.customerTypeLabel.toLowerCase() === tab.toLowerCase();
}

function exportCsv(rows: UnitPriceRow[]) {
  const headers = [
    "id",
    "product",
    "productCode",
    "unitPriceExTax",
    "effectiveFrom",
    "customerType",
    "createdAt",
    "updatedAt",
  ];
  const lines = rows.map((row) =>
    [
      row.id,
      row.productLabel,
      row.productCode,
      row.unitPriceExTax,
      row.effectiveFrom,
      row.customerTypeLabel,
      row.createdAt,
      row.updatedAt,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `unit-prices-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function IconDollar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l6.59-6.59a1 1 0 0 0 0-1.41L12 2Z" />
      <path d="M7 7h.01" />
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

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function IconSliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

function IconChevronUp({ active = false }: { active?: boolean }) {
  return (
    <svg class={`customers-sort-icon${active ? " is-active" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function IconChevronDown({ active = false }: { active?: boolean }) {
  return (
    <svg class={`customers-sort-icon${active ? " is-active" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ActionMenu({
  onView,
  onEdit,
  onDelete,
  canWrite = true,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canWrite?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div class="customers-actions" ref={rootRef}>
      <button type="button" class="customers-actions-trigger" aria-label="Actions" onClick={() => setOpen((current) => !current)}>
        <IconMore />
      </button>
      {open ? (
        <div class="customers-actions-menu">
          <button type="button" class="customers-actions-item" onClick={() => { setOpen(false); onView(); }}><IconEye /> View</button>
          {canWrite ? (
            <>
              <button type="button" class="customers-actions-item" onClick={() => { setOpen(false); onEdit(); }}><IconPencil /> Edit</button>
              <div class="customers-actions-divider" />
              <button type="button" class="customers-actions-item customers-actions-item-danger" onClick={() => { setOpen(false); onDelete(); }}><IconTrash /> Delete</button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface ProductUnitPricesScreenProps {
  readOnly?: boolean;
}

export function ProductUnitPricesScreen({ readOnly = false }: ProductUnitPricesScreenProps = {}) {
  const canWrite = !readOnly;
  const [rows, setRows] = useState<UnitPriceRow[]>([]);
  const [typeTabs, setTypeTabs] = useState<string[]>([]);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("effectiveFrom");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [formState, setFormState] = useState<FormState | null>(null);
  const [viewRow, setViewRow] = useState<UnitPriceRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const api = getElectronApi();
        const [priceResult, productResult, typeResult, tableSchema] = await Promise.all([
          api.db.queryTable({ table: "ProductUnitPriceSchedule", limit: 500 }),
          api.db.queryTable({ table: "Product", limit: 500 }),
          api.db.queryTable({ table: "CustomerTypeDefinition", limit: 200 }),
          api.db.getTableSchema("ProductUnitPriceSchedule"),
        ]);
        if (cancelled) return;

        const productMap = new Map<number, { label: string; code: string }>();
        for (const product of productResult.rows) {
          const id = Number(product.productId);
          productMap.set(id, {
            label: String(product.productName ?? id),
            code: product.productCode ? String(product.productCode) : "—",
          });
        }

        const typeMap = new Map(
          typeResult.rows.map((row) => [
            String(row.id),
            String(row.name ?? row.code ?? row.id),
          ]),
        );

        const mapped = priceResult.rows.map((row) => {
          const productId = Number(row.productId);
          const product = productMap.get(productId);
          const customerTypeId = row.customerTypeId ? String(row.customerTypeId) : null;
          const unitPriceExTax = String(row.unitPriceExTax ?? "");

          return {
            id: String(row.id ?? ""),
            productId,
            productLabel: product?.label ?? String(productId),
            productCode: product?.code ?? "—",
            unitPriceExTax,
            unitPriceNumeric: Number(unitPriceExTax) || 0,
            effectiveFrom: formatDate(row.effectiveFrom),
            customerTypeId,
            customerTypeLabel: customerTypeId
              ? typeMap.get(customerTypeId) ?? customerTypeId
              : "Direct",
            createdAt: formatDate(row.createdAt),
            updatedAt: formatDate(row.updatedAt),
            raw: row,
          } satisfies UnitPriceRow;
        });

        const tabs = [...new Set(mapped.map((row) => row.customerTypeLabel).filter((label) => label !== "Direct"))].sort(
          (left, right) => left.localeCompare(right),
        );

        setRows(mapped);
        setTypeTabs(tabs);
        setSchema(tableSchema);
        setSelectedIds(new Set());
      } catch (loadError) {
        if (!cancelled) {
          setRows([]);
          setTypeTabs([]);
          setError(loadError instanceof Error ? loadError.message : "Failed to load unit prices.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchSearch =
        !query ||
        row.productLabel.toLowerCase().includes(query) ||
        row.productCode.toLowerCase().includes(query) ||
        row.customerTypeLabel.toLowerCase().includes(query) ||
        row.unitPriceExTax.includes(query) ||
        row.effectiveFrom.includes(query);
      return matchSearch && matchesTab(row, activeTab);
    });
  }, [rows, search, activeTab]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    next.sort((left, right) => {
      let result = 0;
      if (sortKey === "unitPriceExTax") {
        result = left.unitPriceNumeric - right.unitPriceNumeric;
      } else {
        result = String(left[sortKey]).localeCompare(String(right[sortKey]), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      return sortDir === "asc" ? result : -result;
    });
    return next;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const allSelected =
    paginated.length > 0 && paginated.every((row) => selectedIds.has(row.id));

  const stats = useMemo(
    () => [
      { label: "Total Prices", value: rows.length, icon: IconDollar, className: "customers-stat-icon-blue" },
      { label: "Products", value: new Set(rows.map((row) => row.productId)).size, icon: IconPackage, className: "customers-stat-icon-violet" },
      { label: "By Type", value: rows.filter((row) => row.customerTypeId).length, icon: IconUsers, className: "customers-stat-icon-emerald" },
      { label: "Direct", value: rows.filter((row) => !row.customerTypeId).length, icon: IconTag, className: "customers-stat-icon-amber" },
    ],
    [rows],
  );

  function refreshRows() { setRefreshKey((current) => current + 1); }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((current) => {
        const next = new Set(current);
        paginated.forEach((row) => next.delete(row.id));
        return next;
      });
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      paginated.forEach((row) => next.add(row.id));
      return next;
    });
  }

  async function deletePrice(row: UnitPriceRow) {
    if (!schema) return;
    const confirmed = window.confirm(`Delete price for "${row.productLabel}"? This cannot be undone.`);
    if (!confirmed) return;
    setActionError(null);
    try {
      await getAuthenticatedDb().deleteRow({
        table: "ProductUnitPriceSchedule",
        primaryKey: { id: row.id },
      });
      refreshRows();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Failed to delete unit price.");
    }
  }

  async function deleteSelected() {
    if (!schema || selectedIds.size === 0) return;
    const confirmed = window.confirm(`Delete ${selectedIds.size} selected price(s)? This cannot be undone.`);
    if (!confirmed) return;
    setActionError(null);
    try {
      for (const row of rows.filter((item) => selectedIds.has(item.id))) {
        await getAuthenticatedDb().deleteRow({
          table: "ProductUnitPriceSchedule",
          primaryKey: { id: row.id },
        });
      }
      refreshRows();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Failed to delete selected prices.");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <IconChevronUp />;
    return sortDir === "asc" ? <IconChevronUp active /> : <IconChevronDown active />;
  }

  function SortableTh({ label, col, className = "" }: { label: string; col: SortKey; className?: string }) {
    return (
      <th class={`is-sortable ${className}`.trim()} onClick={() => toggleSort(col)}>
        <span class="customers-th-inner">{label}<SortIcon col={col} /></span>
      </th>
    );
  }

  const pageStart = sorted.length === 0 ? 0 : Math.min((currentPage - 1) * PAGE_SIZE + 1, sorted.length);
  const pageEnd = Math.min(currentPage * PAGE_SIZE, sorted.length);
  const tabItems = ["all", "Direct", ...typeTabs] as const;

  return (
    <div class="customers-screen">
      <header class="customers-screen-header">
        <div class="customers-screen-brand">
          <div class="customers-screen-brand-icon"><IconDollar /></div>
          <div>
            <h2 class="customers-screen-brand-title">ProductCatalog</h2>
            <p class="customers-screen-brand-subtitle">Unit Price Schedules</p>
          </div>
        </div>
        <div class="customers-screen-header-actions">
          <button type="button" class="customers-btn customers-btn-secondary" disabled={sorted.length === 0} onClick={() => exportCsv(sorted)}>
            <IconDownload /> Export
          </button>
          {canWrite ? (
            <button type="button" class="customers-btn customers-btn-primary" disabled={!schema || isLoading} onClick={() => { setViewRow(null); setFormState({ mode: "create" }); }}>
              <IconPlus /> Add Price
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p class="customers-error">{error}</p> : null}
      {actionError ? <p class="customers-error">{actionError}</p> : null}

      <div class="customers-stats">
        {stats.map((stat) => (
          <div key={stat.label} class="customers-stat-card">
            <div class={`customers-stat-icon ${stat.className}`}><stat.icon /></div>
            <div>
              <p class="customers-stat-value">{stat.value}</p>
              <p class="customers-stat-label">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div class="customers-card">
        <div class="customers-card-toolbar">
          <div class="customers-card-toolbar-row">
            <div>
              <h3 class="customers-card-title">All Unit Prices</h3>
              <p class="customers-card-subtitle">{isLoading ? "Loading…" : `${filtered.length} records`}</p>
            </div>
            <div class="customers-card-controls">
              <div class="customers-tabs">
                {tabItems.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    class={`customers-tab${activeTab === tab ? " is-active" : ""}`}
                    onClick={() => { setActiveTab(tab); setPage(1); }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div class="customers-search-wrap">
                <IconSearch />
                <input
                  class="customers-search"
                  type="search"
                  value={search}
                  placeholder="Search prices…"
                  onInput={(event) => {
                    setSearch((event.currentTarget as HTMLInputElement).value);
                    setPage(1);
                  }}
                />
              </div>
              <button type="button" class="customers-btn customers-btn-secondary"><IconSliders /> Filters</button>
            </div>
          </div>

          {selectedIds.size > 0 ? (
            <div class="customers-selection-bar">
              <strong>{selectedIds.size} selected</strong>
              {canWrite ? (
                <button type="button" class="customers-link-btn customers-link-btn-danger" onClick={() => void deleteSelected()}>Delete selected</button>
              ) : null}
              <button type="button" class="customers-link-btn customers-link-btn-primary" onClick={() => exportCsv(rows.filter((row) => selectedIds.has(row.id)))}>Export selected</button>
              <button type="button" class="customers-link-btn customers-link-btn-muted" onClick={() => setSelectedIds(new Set())}>Clear</button>
            </div>
          ) : null}
        </div>

        <div class="customers-table-scroll">
          <table class="customers-table">
            <thead>
              <tr>
                <th style="width: 40px;">
                  <input type="checkbox" class="customers-checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <SortableTh label="Product" col="productLabel" />
                <SortableTh label="Price" col="unitPriceExTax" />
                <SortableTh label="Effective" col="effectiveFrom" className="customers-col-hide-md" />
                <SortableTh label="Customer Type" col="customerTypeLabel" />
                <SortableTh label="Created" col="createdAt" className="customers-col-hide-lg" />
                <th style="width: 40px;" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} class="customers-table-empty">Loading unit prices…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} class="customers-table-empty">No unit prices match your search.</td></tr>
              ) : (
                paginated.map((row) => (
                  <tr key={row.id} class={selectedIds.has(row.id) ? "is-selected" : ""}>
                    <td>
                      <input type="checkbox" class="customers-checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} />
                    </td>
                    <td>
                      <div class="customers-name-cell">
                        <div class="customers-avatar">{initials(row.productLabel)}</div>
                        <div>
                          <p class="customers-name-primary">{row.productLabel}</p>
                          <p class="customers-name-secondary">{row.productCode}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="customers-mono-chip">{formatPrice(row.unitPriceExTax)}</span>
                    </td>
                    <td class="customers-col-hide-md">
                      <span class="customers-contact-mono">{row.effectiveFrom}</span>
                    </td>
                    <td>
                      <span class={typeBadgeClass(row.customerTypeLabel)}>{row.customerTypeLabel}</span>
                    </td>
                    <td class="customers-col-hide-lg">
                      <div class="customers-dates">
                        <div>{row.createdAt}</div>
                        <div class="customers-dates-updated">↑ {row.updatedAt}</div>
                      </div>
                    </td>
                    <td>
                      <ActionMenu
                        canWrite={canWrite}
                        onView={() => setViewRow(row)}
                        onEdit={() => {
                          setViewRow(null);
                          setFormState({ mode: "edit", row: row.raw });
                        }}
                        onDelete={() => void deletePrice(row)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div class="customers-pagination">
          <span>Showing {pageStart}–{pageEnd} of {sorted.length}</span>
          <div class="customers-pagination-pages">
            <button type="button" class="customers-pagination-btn" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><IconChevronLeft /></button>
            <span class="customers-pagination-current">{currentPage} / {totalPages}</span>
            <button type="button" class="customers-pagination-btn" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><IconChevronRight /></button>
          </div>
        </div>
      </div>

      {formState ? (
        <ProductUnitPriceFormModal
          mode={formState.mode}
          row={formState.mode === "edit" ? formState.row : undefined}
          onClose={() => setFormState(null)}
          onSaved={refreshRows}
        />
      ) : null}

      {viewRow ? (
        <FormDialog ariaLabel={`View price for ${viewRow.productLabel}`} title={viewRow.productLabel} subtitle="Unit price details" onClose={() => setViewRow(null)}>
          <div class="customers-view-grid">
            {[
              ["ID", viewRow.id],
              ["Product code", viewRow.productCode],
              ["Unit price (ex tax)", formatPrice(viewRow.unitPriceExTax)],
              ["Effective from", viewRow.effectiveFrom],
              ["Customer type", viewRow.customerTypeLabel],
              ["Created", viewRow.createdAt],
              ["Updated", viewRow.updatedAt],
            ].map(([label, value]) => (
              <div key={label} class="customers-view-row">
                <span class="customers-view-label">{label}</span>
                <span class="customers-view-value">{value}</span>
              </div>
            ))}
          </div>
          <div class="form-dialog-actions" style="padding-left: 0; margin-top: 12px;">
            {canWrite ? (
              <button type="button" class="form-dialog-btn-primary" onClick={() => { setViewRow(null); setFormState({ mode: "edit", row: viewRow.raw }); }}>Edit price</button>
            ) : null}
            <button type="button" class="form-dialog-btn-secondary" onClick={() => setViewRow(null)}>Close</button>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
