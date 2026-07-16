import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";

import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";
import { ProductFormModal } from "./ProductFormModal.tsx";
import type { TableSchema } from "../types/electron.d.ts";
import "../customers/CustomersScreen.css";

type SortKey =
  | "productName"
  | "productCode"
  | "categoryLabel"
  | "uom"
  | "commercialServiceLabel"
  | "createdAt";

type SortDir = "asc" | "desc";
type ActiveTab = "all" | string;

interface ProductRow {
  productId: number;
  productName: string;
  productCode: string;
  productCatId: number;
  categoryLabel: string;
  categoryCode: string;
  categoryIsMain: boolean;
  categoryIsBottled: boolean;
  commercialServiceId: string;
  commercialServiceLabel: string;
  uom: string;
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

function formatDate(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function categoryBadgeClass(label: string): string {
  const normalized = label.toLowerCase();
  if (normalized.includes("palm")) {
    return "customers-badge customers-badge-emerald";
  }
  if (normalized.includes("bottle")) {
    return "customers-badge customers-badge-violet";
  }
  if (normalized.includes("main")) {
    return "customers-badge customers-badge-slate";
  }
  return "customers-badge customers-badge-blue";
}

function matchesTab(row: ProductRow, tab: ActiveTab): boolean {
  if (tab === "all") {
    return true;
  }
  return row.categoryLabel.toLowerCase() === tab.toLowerCase();
}

function exportCsv(rows: ProductRow[]) {
  const headers = [
    "productId",
    "productName",
    "productCode",
    "category",
    "uom",
    "commercialService",
    "createdAt",
    "updatedAt",
  ];

  const lines = rows.map((row) =>
    [
      row.productId,
      row.productName,
      row.productCode,
      row.categoryLabel,
      row.uom,
      row.commercialServiceLabel,
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
  link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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

function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m12.83 2.18 8.49 4.92a1 1 0 0 1 0 1.74l-8.49 4.91a2 2 0 0 1-1.66 0L2.68 8.84a1 1 0 0 1 0-1.74l8.49-4.92a2 2 0 0 1 1.66 0Z" />
      <path d="m22 12.65-8.49 4.91a2 2 0 0 1-1.66 0L3.35 12.65" />
      <path d="m22 17.65-8.49 4.91a2 2 0 0 1-1.66 0L3.35 17.65" />
    </svg>
  );
}

function IconDroplet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12 2 12 2 8 6.5 8 9.5a7 7 0 0 0 7 12.5Z" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.3 7 12 12l8.7-5M12 22V12" />
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
    <svg
      class={`customers-sort-icon${active ? " is-active" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function IconChevronDown({ active = false }: { active?: boolean }) {
  return (
    <svg
      class={`customers-sort-icon${active ? " is-active" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
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
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div class="customers-actions" ref={rootRef}>
      <button
        type="button"
        class="customers-actions-trigger"
        aria-label="Actions"
        onClick={() => setOpen((current) => !current)}
      >
        <IconMore />
      </button>

      {open ? (
        <div class="customers-actions-menu">
          <button
            type="button"
            class="customers-actions-item"
            onClick={() => {
              setOpen(false);
              onView();
            }}
          >
            <IconEye />
            View
          </button>
          {canWrite ? (
            <>
              <button
                type="button"
                class="customers-actions-item"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                <IconPencil />
                Edit
              </button>
              <div class="customers-actions-divider" />
              <button
                type="button"
                class="customers-actions-item customers-actions-item-danger"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                <IconTrash />
                Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface ProductsScreenProps {
  readOnly?: boolean;
}

export function ProductsScreen({ readOnly = false }: ProductsScreenProps = {}) {
  const canWrite = !readOnly;
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categoryTabs, setCategoryTabs] = useState<string[]>([]);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("productName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [formState, setFormState] = useState<FormState | null>(null);
  const [viewRow, setViewRow] = useState<ProductRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const api = getElectronApi();
        const [productResult, categoryResult, serviceResult, tableSchema] =
          await Promise.all([
            api.db.queryTable({ table: "Product", limit: 500 }),
            api.db.queryTable({ table: "ProductCat", limit: 200 }),
            api.db.queryTable({ table: "CommercialService", limit: 200 }),
            api.db.getTableSchema("Product"),
          ]);

        if (cancelled) {
          return;
        }

        const categoryMap = new Map<
          number,
          {
            label: string;
            code: string;
            isMain: boolean;
            isBottled: boolean;
          }
        >();

        for (const category of categoryResult.rows) {
          const id = Number(category.productCatId);
          categoryMap.set(id, {
            label: String(category.productCat ?? id),
            code: String(category.productCode ?? ""),
            isMain: category.isMain === 1 || category.isMain === true,
            isBottled: category.isBottled === 1 || category.isBottled === true,
          });
        }

        const serviceMap = new Map(
          serviceResult.rows.map((row) => [
            String(row.id),
            String(row.code ?? row.name ?? row.id),
          ]),
        );

        const mapped = productResult.rows.map((row) => {
          const productCatId = Number(row.productCatId);
          const category = categoryMap.get(productCatId);
          const commercialServiceId = row.commercialServiceId
            ? String(row.commercialServiceId)
            : "";

          return {
            productId: Number(row.productId),
            productName: String(row.productName ?? ""),
            productCode: row.productCode ? String(row.productCode) : "—",
            productCatId,
            categoryLabel: category?.label ?? String(productCatId),
            categoryCode: category?.code ?? "—",
            categoryIsMain: category?.isMain ?? false,
            categoryIsBottled: category?.isBottled ?? false,
            commercialServiceId,
            commercialServiceLabel: commercialServiceId
              ? serviceMap.get(commercialServiceId) ?? commercialServiceId
              : "—",
            uom: String(row.uom ?? "Kg"),
            createdAt: formatDate(row.createdAt),
            updatedAt: formatDate(row.updatedAt),
            raw: row,
          } satisfies ProductRow;
        });

        const tabs = [...new Set(mapped.map((row) => row.categoryLabel))].sort(
          (left, right) => left.localeCompare(right),
        );

        setRows(mapped);
        setCategoryTabs(tabs);
        setSchema(tableSchema);
        setSelectedIds(new Set());
      } catch (loadError) {
        if (!cancelled) {
          setRows([]);
          setCategoryTabs([]);
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load products.",
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
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchSearch =
        !query ||
        row.productName.toLowerCase().includes(query) ||
        row.productCode.toLowerCase().includes(query) ||
        row.categoryLabel.toLowerCase().includes(query) ||
        row.commercialServiceLabel.toLowerCase().includes(query) ||
        row.uom.toLowerCase().includes(query);

      return matchSearch && matchesTab(row, activeTab);
    });
  }, [rows, search, activeTab]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    next.sort((left, right) => {
      const leftValue = String(left[sortKey] ?? "");
      const rightValue = String(right[sortKey] ?? "");
      const result = leftValue.localeCompare(rightValue, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDir === "asc" ? result : -result;
    });
    return next;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const allSelected =
    paginated.length > 0 && paginated.every((row) => selectedIds.has(row.productId));

  const stats = useMemo(
    () => [
      {
        label: "Total Products",
        value: rows.length,
        icon: IconPackage,
        className: "customers-stat-icon-blue",
      },
      {
        label: "Categories",
        value: categoryTabs.length,
        icon: IconLayers,
        className: "customers-stat-icon-violet",
      },
      {
        label: "Main Products",
        value: rows.filter((row) => row.categoryIsMain).length,
        icon: IconDroplet,
        className: "customers-stat-icon-emerald",
      },
      {
        label: "Bottled",
        value: rows.filter((row) => row.categoryIsBottled).length,
        icon: IconBox,
        className: "customers-stat-icon-amber",
      },
    ],
    [rows, categoryTabs.length],
  );

  function refreshRows() {
    setRefreshKey((current) => current + 1);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function toggleSelect(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
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
      setSelectedIds((current) => {
        const next = new Set(current);
        paginated.forEach((row) => next.delete(row.productId));
        return next;
      });
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      paginated.forEach((row) => next.add(row.productId));
      return next;
    });
  }

  async function deleteProduct(row: ProductRow) {
    if (!schema) {
      return;
    }

    const confirmed = window.confirm(
      `Delete product "${row.productName}"? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      await getAuthenticatedDb().deleteRow({
        table: "Product",
        primaryKey: { productId: row.productId },
      });
      refreshRows();
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete product.",
      );
    }
  }

  async function deleteSelected() {
    if (!schema || selectedIds.size === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.size} selected product(s)? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      for (const row of rows.filter((item) => selectedIds.has(item.productId))) {
        await getAuthenticatedDb().deleteRow({
          table: "Product",
          primaryKey: { productId: row.productId },
        });
      }
      refreshRows();
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete selected products.",
      );
    }
  }

  function exportRows(targetRows: ProductRow[]) {
    if (targetRows.length === 0) {
      return;
    }
    exportCsv(targetRows);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) {
      return <IconChevronUp />;
    }
    return sortDir === "asc" ? <IconChevronUp active /> : <IconChevronDown active />;
  }

  function SortableTh({
    label,
    col,
    className = "",
  }: {
    label: string;
    col: SortKey;
    className?: string;
  }) {
    return (
      <th class={`is-sortable ${className}`.trim()} onClick={() => toggleSort(col)}>
        <span class="customers-th-inner">
          {label}
          <SortIcon col={col} />
        </span>
      </th>
    );
  }

  const pageStart =
    sorted.length === 0 ? 0 : Math.min((currentPage - 1) * PAGE_SIZE + 1, sorted.length);
  const pageEnd = Math.min(currentPage * PAGE_SIZE, sorted.length);

  return (
    <div class="customers-screen">
      <header class="customers-screen-header">
        <div class="customers-screen-brand">
          <div class="customers-screen-brand-icon">
            <IconPackage />
          </div>
          <div>
            <h2 class="customers-screen-brand-title">ProductCatalog</h2>
            <p class="customers-screen-brand-subtitle">Product Management</p>
          </div>
        </div>

        <div class="customers-screen-header-actions">
          <button
            type="button"
            class="customers-btn customers-btn-secondary"
            disabled={sorted.length === 0}
            onClick={() => exportRows(sorted)}
          >
            <IconDownload />
            Export
          </button>
          {canWrite ? (
            <button
              type="button"
              class="customers-btn customers-btn-primary"
              disabled={!schema || isLoading}
              onClick={() => {
                setViewRow(null);
                setFormState({ mode: "create" });
              }}
            >
              <IconPlus />
              Add Product
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p class="customers-error">{error}</p> : null}
      {actionError ? <p class="customers-error">{actionError}</p> : null}

      <div class="customers-stats">
        {stats.map((stat) => (
          <div key={stat.label} class="customers-stat-card">
            <div class={`customers-stat-icon ${stat.className}`}>
              <stat.icon />
            </div>
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
              <h3 class="customers-card-title">All Products</h3>
              <p class="customers-card-subtitle">
                {isLoading ? "Loading…" : `${filtered.length} records`}
              </p>
            </div>

            <div class="customers-card-controls">
              <div class="customers-tabs">
                {(["all", ...categoryTabs] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    class={`customers-tab${activeTab === tab ? " is-active" : ""}`}
                    onClick={() => {
                      setActiveTab(tab);
                      setPage(1);
                    }}
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
                  placeholder="Search products…"
                  onInput={(event) => {
                    setSearch((event.currentTarget as HTMLInputElement).value);
                    setPage(1);
                  }}
                />
              </div>

              <button type="button" class="customers-btn customers-btn-secondary">
                <IconSliders />
                Filters
              </button>
            </div>
          </div>

          {selectedIds.size > 0 ? (
            <div class="customers-selection-bar">
              <strong>{selectedIds.size} selected</strong>
              {canWrite ? (
                <button
                  type="button"
                  class="customers-link-btn customers-link-btn-danger"
                  onClick={() => void deleteSelected()}
                >
                  Delete selected
                </button>
              ) : null}
              <button
                type="button"
                class="customers-link-btn customers-link-btn-primary"
                onClick={() =>
                  exportRows(rows.filter((row) => selectedIds.has(row.productId)))
                }
              >
                Export selected
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
                <th style="width: 40px;">
                  <input
                    type="checkbox"
                    class="customers-checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <SortableTh label="Product" col="productName" />
                <SortableTh label="Code" col="productCode" />
                <SortableTh label="Category" col="categoryLabel" />
                <SortableTh label="UOM" col="uom" className="customers-col-hide-md" />
                <SortableTh
                  label="Service"
                  col="commercialServiceLabel"
                  className="customers-col-hide-lg"
                />
                <SortableTh
                  label="Created"
                  col="createdAt"
                  className="customers-col-hide-lg"
                />
                <th style="width: 40px;" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} class="customers-table-empty">
                    Loading products…
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} class="customers-table-empty">
                    No products match your search.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.productId}
                    class={selectedIds.has(row.productId) ? "is-selected" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        class="customers-checkbox"
                        checked={selectedIds.has(row.productId)}
                        onChange={() => toggleSelect(row.productId)}
                      />
                    </td>

                    <td>
                      <div class="customers-name-cell">
                        <div class="customers-avatar">{initials(row.productName)}</div>
                        <div>
                          <p class="customers-name-primary">{row.productName}</p>
                          <p class="customers-name-secondary">
                            {row.commercialServiceLabel}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span class="customers-mono-chip">{row.productCode}</span>
                    </td>

                    <td>
                      <span class={categoryBadgeClass(row.categoryLabel)}>
                        {row.categoryLabel}
                      </span>
                    </td>

                    <td class="customers-col-hide-md">
                      <span class="customers-contact-mono">{row.uom}</span>
                    </td>

                    <td class="customers-col-hide-lg">
                      <span class="customers-contact-mono">
                        {row.commercialServiceLabel}
                      </span>
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
                        onDelete={() => void deleteProduct(row)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div class="customers-pagination">
          <span>
            Showing {pageStart}–{pageEnd} of {sorted.length}
          </span>
          <div class="customers-pagination-pages">
            <button
              type="button"
              class="customers-pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <IconChevronLeft />
            </button>
            <span class="customers-pagination-current">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              class="customers-pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      {formState ? (
        <ProductFormModal
          mode={formState.mode}
          row={formState.mode === "edit" ? formState.row : undefined}
          onClose={() => setFormState(null)}
          onSaved={refreshRows}
        />
      ) : null}

      {viewRow ? (
        <FormDialog
          ariaLabel={`View ${viewRow.productName}`}
          title={viewRow.productName}
          subtitle="Product details"
          onClose={() => setViewRow(null)}
        >
          <div class="customers-view-grid">
            {[
              ["ID", String(viewRow.productId)],
              ["Code", viewRow.productCode],
              ["Category", viewRow.categoryLabel],
              ["Category code", viewRow.categoryCode],
              ["UOM", viewRow.uom],
              ["Commercial service", viewRow.commercialServiceLabel],
              ["Main category", viewRow.categoryIsMain ? "Yes" : "No"],
              ["Bottled category", viewRow.categoryIsBottled ? "Yes" : "No"],
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
              <button
                type="button"
                class="form-dialog-btn-primary"
                onClick={() => {
                  setViewRow(null);
                  setFormState({ mode: "edit", row: viewRow.raw });
                }}
              >
                Edit product
              </button>
            ) : null}
            <button
              type="button"
              class="form-dialog-btn-secondary"
              onClick={() => setViewRow(null)}
            >
              Close
            </button>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
