import { useEffect, useMemo, useState } from "preact/hooks";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { formatDisplayDate as formatDate } from "../../shared/formatDisplayDate.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { normalizeVatRateDecimal } from "../../shared/taxRules.ts";
import type { TableSchema } from "../types/electron.d.ts";
import {
  CompanySettingsFormModal,
  MONTHS,
  THEME_COLORS,
  THEME_LABELS,
  THEME_PRESETS,
} from "./CompanySettingsFormModal.tsx";
import "./CompanySettingsScreen.css";

export type ThemePreset = "agro" | "dark";

interface CompanyRecord {
  id: string;
  companyName: string;
  department: string;
  vatRate: number;
  fiscalYearStartMonth: number;
  logoUrl: string;
  uiThemePreset: ThemePreset;
  createdAt: string;
  updatedAt: string;
  raw: Record<string, unknown>;
}

type SortField =
  | "companyName"
  | "department"
  | "vatRate"
  | "fiscalYearStartMonth"
  | "uiThemePreset"
  | "updatedAt";

type SortDirection = "asc" | "desc";

type ModalState =
  | { type: "create" }
  | { type: "edit"; record: CompanyRecord }
  | { type: "delete"; record: CompanyRecord }
  | null;

interface CompanySettingsScreenProps {
  readOnly?: boolean;
}

const COLUMNS: Array<{ key: SortField; label: string }> = [
  { key: "companyName", label: "Company" },
  { key: "department", label: "Department" },
  { key: "vatRate", label: "VAT %" },
  { key: "fiscalYearStartMonth", label: "FY start" },
  { key: "uiThemePreset", label: "Theme" },
  { key: "updatedAt", label: "Updated" },
];

function normalizeTheme(value: unknown): ThemePreset {
  return THEME_PRESETS.includes(value as ThemePreset)
    ? (value as ThemePreset)
    : "agro";
}

function LogoCell({ url, name }: { url: string; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
    return (
      <div class="company-settings-logo-placeholder" aria-label="No logo">
        <ImageOff size={15} />
      </div>
    );
  }

  return (
    <img
      class="company-settings-logo"
      src={url}
      alt={`${name} logo`}
      onError={() => setHasError(true)}
    />
  );
}

function ThemeBadge({ preset }: { preset: ThemePreset }) {
  return (
    <span class="company-settings-theme-badge">
      <span
        class="company-settings-theme-dot"
        style={{ background: THEME_COLORS[preset] }}
      />
      {THEME_LABELS[preset]}
    </span>
  );
}

export function CompanySettingsScreen({
  readOnly = false,
}: CompanySettingsScreenProps = {}) {
  const canWrite = !readOnly;
  const [records, setRecords] = useState<CompanyRecord[]>([]);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({ field: "updatedAt", direction: "desc" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const api = getElectronApi();
        const [result, tableSchema] = await Promise.all([
          api.db.queryTable({ table: "CompanySettings", limit: 200 }),
          api.db.getTableSchema("CompanySettings"),
        ]);

        if (cancelled) {
          return;
        }

        setRecords(
          result.rows.map((row) => ({
            id: String(row.id ?? ""),
            companyName: String(row.companyName ?? ""),
            department: String(row.department ?? ""),
            vatRate: normalizeVatRateDecimal(row.vatRate as string | number | null) * 100,
            fiscalYearStartMonth: Number(row.fiscalYearStartMonth ?? 1),
            logoUrl: String(row.logoUrl ?? ""),
            uiThemePreset: normalizeTheme(row.uiThemePreset),
            createdAt: String(row.createdAt ?? ""),
            updatedAt: String(row.updatedAt ?? ""),
            raw: row,
          })),
        );
        setSchema(tableSchema);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load company settings.",
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
    const normalizedQuery = query.trim().toLowerCase();

    return records
      .filter((record) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          record.companyName.toLowerCase().includes(normalizedQuery) ||
          record.department.toLowerCase().includes(normalizedQuery) ||
          record.uiThemePreset.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((left, right) => {
        const leftValue = left[sort.field];
        const rightValue = right[sort.field];
        const result = String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: "base",
        });
        return sort.direction === "asc" ? result : -result;
      });
  }, [records, query, sort]);

  function toggleSort(field: SortField) {
    setSort((current) =>
      current.field === field
        ? {
            field,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { field, direction: "asc" },
    );
  }

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  async function deleteRecord(record: CompanyRecord) {
    setActionError(null);

    try {
      await getAuthenticatedDb().deleteRow({
        table: "CompanySettings",
        primaryKey: { id: record.id },
      });
      setModal(null);
      refresh();
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete company settings.",
      );
      setModal(null);
    }
  }

  return (
    <div class="company-settings-screen">
      <header class="company-settings-header">
        <div class="company-settings-heading">
          <Building2 size={19} />
          <div>
            <h2>Company settings</h2>
            <p>Company identity, fiscal settings, and UI theme registry</p>
          </div>
        </div>

        {canWrite ? (
          <button
            type="button"
            class="company-settings-primary-btn"
            disabled={!schema || isLoading}
            onClick={() => setModal({ type: "create" })}
          >
            <Plus size={14} />
            New record
          </button>
        ) : null}
      </header>

      <div class="company-settings-toolbar">
        <label class="company-settings-search">
          <Search size={14} />
          <input
            type="search"
            value={query}
            placeholder="Search company, department, theme…"
            onInput={(event) =>
              setQuery((event.currentTarget as HTMLInputElement).value)
            }
          />
        </label>
        <span>
          {filtered.length} / {records.length} records
        </span>
      </div>

      {error ? <p class="company-settings-error">{error}</p> : null}
      {actionError ? <p class="company-settings-error">{actionError}</p> : null}

      <div class="company-settings-table-card">
        <div class="company-settings-table-scroll">
          <table class="company-settings-table">
            <thead>
              <tr>
                <th class="company-settings-logo-column" />
                {COLUMNS.map((column) => (
                  <th key={column.key}>
                    <button
                      type="button"
                      class="company-settings-sort"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                      <span>
                        <ChevronUp
                          size={10}
                          class={
                            sort.field === column.key &&
                            sort.direction === "asc"
                              ? "is-active"
                              : ""
                          }
                        />
                        <ChevronDown
                          size={10}
                          class={
                            sort.field === column.key &&
                            sort.direction === "desc"
                              ? "is-active"
                              : ""
                          }
                        />
                      </span>
                    </button>
                  </th>
                ))}
                {canWrite ? <th class="company-settings-actions-title">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + (canWrite ? 2 : 1)}
                    class="company-settings-empty"
                  >
                    Loading company settings…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + (canWrite ? 2 : 1)}
                    class="company-settings-empty"
                  >
                    No records match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <LogoCell url={record.logoUrl} name={record.companyName} />
                    </td>
                    <td>
                      <strong>{record.companyName}</strong>
                      <small>{record.id}</small>
                    </td>
                    <td>{record.department || "—"}</td>
                    <td class="company-settings-mono">
                      {record.vatRate.toFixed(2)}%
                    </td>
                    <td>
                      {MONTHS[record.fiscalYearStartMonth - 1] ?? "—"}
                    </td>
                    <td>
                      <ThemeBadge preset={record.uiThemePreset} />
                    </td>
                    <td class="company-settings-date">
                      {formatDate(record.updatedAt)}
                    </td>
                    {canWrite ? (
                      <td>
                        <div class="company-settings-actions">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => setModal({ type: "edit", record })}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title={
                              record.id === "default"
                                ? "The default company record cannot be deleted"
                                : "Delete"
                            }
                            class="is-danger"
                            disabled={record.id === "default"}
                            onClick={() => setModal({ type: "delete", record })}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.type === "create" || modal?.type === "edit" ? (
        <CompanySettingsFormModal
          key={
            modal.type === "edit"
              ? `edit-${modal.record.id}`
              : "create-company-settings"
          }
          mode={modal.type}
          row={modal.type === "edit" ? modal.record.raw : undefined}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      ) : null}

      {modal?.type === "delete" ? (
        <FormDialog
          ariaLabel="Delete company settings"
          title="Delete record"
          onClose={() => setModal(null)}
        >
          <div class="company-settings-delete">
            <p>
              Permanently delete <strong>{modal.record.companyName}</strong>?
              This cannot be undone.
            </p>
            <div class="form-dialog-actions">
              <button
                type="button"
                class="form-dialog-btn-secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                class="company-settings-delete-btn"
                onClick={() => void deleteRecord(modal.record)}
              >
                Delete
              </button>
            </div>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
