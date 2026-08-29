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
import type { AuthUser } from "../auth/session.ts";
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
  user?: AuthUser | null;
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
  user = null,
}: CompanySettingsScreenProps = {}) {
  const canWrite = !readOnly;
  const isAdmin = user?.role === "ADMIN";
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
  const [autoGenerateStockReceiptNo, setAutoGenerateStockReceiptNo] = useState(true);
  const [autoGenerateStockTransferNo, setAutoGenerateStockTransferNo] = useState(true);
  const [stockNumberSaving, setStockNumberSaving] = useState(false);
  const [stockNumberSavedHint, setStockNumberSavedHint] = useState<string | null>(null);
  const [bottleOilUseRegisteredCustomers, setBottleOilUseRegisteredCustomers] =
    useState(false);
  const [bottleOilAllowRation, setBottleOilAllowRation] = useState(false);
  const [bottleOilSettingSaving, setBottleOilSettingSaving] = useState(false);
  const [bottleOilSettingSavedHint, setBottleOilSettingSavedHint] = useState<
    string | null
  >(null);
  const [
    stockTransferReceiveUsesDocumentDate,
    setStockTransferReceiveUsesDocumentDate,
  ] = useState(false);
  const [
    loosePalmOilAllowInterSalesPointTransfer,
    setLoosePalmOilAllowInterSalesPointTransfer,
  ] = useState(false);
  const [stockTransferSettingSaving, setStockTransferSettingSaving] =
    useState(false);
  const [stockTransferSettingSavedHint, setStockTransferSettingSavedHint] =
    useState<string | null>(null);
  const [looseSalesAllowPublicRelation, setLooseSalesAllowPublicRelation] =
    useState(false);
  const [
    looseSalesAllowUnregisteredCustomer,
    setLooseSalesAllowUnregisteredCustomer,
  ] = useState(false);
  const [loosePalmOilRequireSalesTank, setLoosePalmOilRequireSalesTank] =
    useState(true);
  const [looseSalesSettingSaving, setLooseSalesSettingSaving] = useState(false);
  const [looseSalesSettingSavedHint, setLooseSalesSettingSavedHint] = useState<
    string | null
  >(null);
  const [clearOpsOpen, setClearOpsOpen] = useState(false);
  const [clearOpsConfirmText, setClearOpsConfirmText] = useState("");
  const [clearOpsBusy, setClearOpsBusy] = useState(false);
  const [clearOpsError, setClearOpsError] = useState<string | null>(null);
  const [clearOpsSuccessHint, setClearOpsSuccessHint] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStockNumberSettings() {
      try {
        const result = await getAuthenticatedDb().queryTable({
          table: "CompanySettings",
          limit: 50,
        });
        if (cancelled) {
          return;
        }
        const row = (result.rows as Array<Record<string, unknown>>).find(
          (r) => String(r.id) === "default",
        );
        if (!row) {
          setAutoGenerateStockReceiptNo(true);
          setAutoGenerateStockTransferNo(true);
          setBottleOilUseRegisteredCustomers(false);
          setBottleOilAllowRation(false);
          setStockTransferReceiveUsesDocumentDate(false);
          setLoosePalmOilAllowInterSalesPointTransfer(false);
          setLooseSalesAllowPublicRelation(false);
          setLooseSalesAllowUnregisteredCustomer(false);
          setLoosePalmOilRequireSalesTank(true);
          return;
        }
        setAutoGenerateStockReceiptNo(
          row.autoGenerateStockReceiptNo == null
            ? true
            : Number(row.autoGenerateStockReceiptNo) !== 0,
        );
        setAutoGenerateStockTransferNo(
          row.autoGenerateStockTransferNo == null
            ? true
            : Number(row.autoGenerateStockTransferNo) !== 0,
        );
        setBottleOilUseRegisteredCustomers(
          Number(row.bottleOilUseRegisteredCustomers ?? 0) !== 0,
        );
        setBottleOilAllowRation(Number(row.bottleOilAllowRation ?? 0) !== 0);
        setStockTransferReceiveUsesDocumentDate(
          Number(row.stockTransferReceiveUsesDocumentDate ?? 0) !== 0,
        );
        setLoosePalmOilAllowInterSalesPointTransfer(
          Number(row.loosePalmOilAllowInterSalesPointTransfer ?? 0) !== 0,
        );
        setLooseSalesAllowPublicRelation(
          Number(row.looseSalesAllowPublicRelation ?? 0) !== 0,
        );
        setLooseSalesAllowUnregisteredCustomer(
          Number(row.looseSalesAllowUnregisteredCustomer ?? 0) !== 0,
        );
        setLoosePalmOilRequireSalesTank(
          row.loosePalmOilRequireSalesTank == null
            ? true
            : Number(row.loosePalmOilRequireSalesTank) !== 0,
        );
      } catch {
        if (!cancelled) {
          setAutoGenerateStockReceiptNo(true);
          setAutoGenerateStockTransferNo(true);
          setBottleOilUseRegisteredCustomers(false);
          setBottleOilAllowRation(false);
          setStockTransferReceiveUsesDocumentDate(false);
          setLoosePalmOilAllowInterSalesPointTransfer(false);
          setLooseSalesAllowPublicRelation(false);
          setLooseSalesAllowUnregisteredCustomer(false);
          setLoosePalmOilRequireSalesTank(true);
        }
      }
    }

    void loadStockNumberSettings();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function onSaveStockNumberSettings() {
    if (!canWrite || stockNumberSaving) {
      return;
    }
    setStockNumberSaving(true);
    setActionError(null);
    setStockNumberSavedHint(null);
    try {
      await getAuthenticatedDb().updateRow({
        table: "CompanySettings",
        primaryKey: { id: "default" },
        values: {
          autoGenerateStockReceiptNo: autoGenerateStockReceiptNo ? 1 : 0,
          autoGenerateStockTransferNo: autoGenerateStockTransferNo ? 1 : 0,
        },
      });
      setStockNumberSavedHint("Stock document numbering saved.");
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save stock document numbering.",
      );
    } finally {
      setStockNumberSaving(false);
    }
  }

  async function onSaveBottleOilSettings() {
    if (!canWrite || bottleOilSettingSaving) {
      return;
    }
    setBottleOilSettingSaving(true);
    setActionError(null);
    setBottleOilSettingSavedHint(null);
    try {
      await getAuthenticatedDb().updateRow({
        table: "CompanySettings",
        primaryKey: { id: "default" },
        values: {
          bottleOilUseRegisteredCustomers: bottleOilUseRegisteredCustomers ? 1 : 0,
          bottleOilAllowRation: bottleOilAllowRation ? 1 : 0,
        },
      });
      setBottleOilSettingSavedHint("Bottle Oil sales options saved.");
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save Bottle Oil sales options.",
      );
    } finally {
      setBottleOilSettingSaving(false);
    }
  }

  async function onSaveStockTransferSettings() {
    if (!canWrite || stockTransferSettingSaving) {
      return;
    }
    setStockTransferSettingSaving(true);
    setActionError(null);
    setStockTransferSettingSavedHint(null);
    try {
      await getAuthenticatedDb().updateRow({
        table: "CompanySettings",
        primaryKey: { id: "default" },
        values: {
          stockTransferReceiveUsesDocumentDate: stockTransferReceiveUsesDocumentDate
            ? 1
            : 0,
          loosePalmOilAllowInterSalesPointTransfer:
            loosePalmOilAllowInterSalesPointTransfer ? 1 : 0,
        },
      });
      setStockTransferSettingSavedHint("Stock transfer options saved.");
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save stock transfer options.",
      );
    } finally {
      setStockTransferSettingSaving(false);
    }
  }

  async function onSaveLooseSalesSettings() {
    if (!canWrite || looseSalesSettingSaving) {
      return;
    }
    setLooseSalesSettingSaving(true);
    setActionError(null);
    setLooseSalesSettingSavedHint(null);
    try {
      await getAuthenticatedDb().updateRow({
        table: "CompanySettings",
        primaryKey: { id: "default" },
        values: {
          looseSalesAllowPublicRelation: looseSalesAllowPublicRelation ? 1 : 0,
          looseSalesAllowUnregisteredCustomer: looseSalesAllowUnregisteredCustomer
            ? 1
            : 0,
          loosePalmOilRequireSalesTank: loosePalmOilRequireSalesTank ? 1 : 0,
        },
      });
      setLooseSalesSettingSavedHint("Loose sales options saved.");
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save loose sales options.",
      );
    } finally {
      setLooseSalesSettingSaving(false);
    }
  }

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

  function openClearOpsModal() {
    setClearOpsConfirmText("");
    setClearOpsError(null);
    setClearOpsOpen(true);
  }

  function closeClearOpsModal() {
    if (clearOpsBusy) {
      return;
    }
    setClearOpsOpen(false);
    setClearOpsConfirmText("");
    setClearOpsError(null);
  }

  function formatClearOpsSummary(
    deleted: Record<string, number>,
    sequences: Record<string, number>,
  ): string {
    const deletedParts = Object.entries(deleted)
      .filter(([, count]) => count > 0)
      .map(([table, count]) => `${table} (${count})`);
    const sequenceParts = Object.entries(sequences)
      .filter(([, count]) => count > 0)
      .map(([table]) => table);
    const deletedLabel =
      deletedParts.length > 0 ? deletedParts.join(", ") : "no rows";
    const sequencesLabel =
      sequenceParts.length > 0
        ? ` Sequences reset: ${sequenceParts.join(", ")}.`
        : "";
    return `Cleared operational data: ${deletedLabel}.${sequencesLabel} Refresh open stock, sales, and delivery order screens.`;
  }

  async function onConfirmClearOps() {
    if (clearOpsBusy || clearOpsConfirmText !== "CLEAR") {
      return;
    }

    setClearOpsBusy(true);
    setClearOpsError(null);
    setClearOpsSuccessHint(null);
    setActionError(null);

    try {
      const result = await getAuthenticatedDb().clearOperationalData({
        confirm: "CLEAR",
      });
      if (result.ok === false) {
        setClearOpsError(result.error);
        return;
      }

      setClearOpsOpen(false);
      setClearOpsConfirmText("");
      setClearOpsSuccessHint(
        formatClearOpsSummary(result.deleted, result.sequences),
      );
    } catch (clearError) {
      setClearOpsError(
        clearError instanceof Error
          ? clearError.message
          : "Failed to clear operational data.",
      );
    } finally {
      setClearOpsBusy(false);
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

      <section class="company-settings-stock-numbering">
        <div class="company-settings-stock-numbering-header">
          <div>
            <h3>Stock document numbering</h3>
            <p>
              Choose whether receipt and transfer numbers are assigned automatically
              or entered when drafting new documents.
            </p>
          </div>
          {canWrite ? (
            <button
              type="button"
              class="company-settings-primary-btn"
              disabled={isLoading || stockNumberSaving}
              onClick={() => void onSaveStockNumberSettings()}
            >
              {stockNumberSaving ? "Saving…" : "Save numbering options"}
            </button>
          ) : null}
        </div>
        {stockNumberSavedHint && !actionError ? (
          <p class="company-settings-stock-numbering-hint">{stockNumberSavedHint}</p>
        ) : null}
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={autoGenerateStockReceiptNo}
            disabled={isLoading || !canWrite || stockNumberSaving}
            onChange={(event) => {
              setAutoGenerateStockReceiptNo(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setStockNumberSavedHint(null);
            }}
          />
          <span>
            <strong>Auto-generate receipt numbers</strong>
            <span>
              When unchecked, users must enter a receipt number when creating a new
              stock receipt draft.
            </span>
          </span>
        </label>
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={autoGenerateStockTransferNo}
            disabled={isLoading || !canWrite || stockNumberSaving}
            onChange={(event) => {
              setAutoGenerateStockTransferNo(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setStockNumberSavedHint(null);
            }}
          />
          <span>
            <strong>Auto-generate transfer numbers</strong>
            <span>
              When unchecked, users must enter a transfer number when creating a new
              stock transfer draft.
            </span>
          </span>
        </label>
      </section>

      <section class="company-settings-stock-numbering">
        <div class="company-settings-stock-numbering-header">
          <div>
            <h3>Bottle Oil sales</h3>
            <p>
              Options for Bottle Oil invoices: registered customers and whether
              Ration disposition is allowed.
            </p>
          </div>
          {canWrite ? (
            <button
              type="button"
              class="company-settings-primary-btn"
              disabled={isLoading || bottleOilSettingSaving}
              onClick={() => void onSaveBottleOilSettings()}
            >
              {bottleOilSettingSaving ? "Saving…" : "Save Bottle Oil options"}
            </button>
          ) : null}
        </div>
        {bottleOilSettingSavedHint && !actionError ? (
          <p class="company-settings-stock-numbering-hint">
            {bottleOilSettingSavedHint}
          </p>
        ) : null}
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={bottleOilUseRegisteredCustomers}
            disabled={isLoading || !canWrite || bottleOilSettingSaving}
            onChange={(event) => {
              setBottleOilUseRegisteredCustomers(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setBottleOilSettingSavedHint(null);
            }}
          />
          <span>
            <strong>Use registered customers</strong>
            <span>
              When unchecked (default), Bottle Oil sales never shows the
              registered-customer checkbox and requires a customer name on the
              invoice. When checked, Bottle Oil sales requires a customer from the
              directory (still no per-invoice checkbox — this setting is the
              switch).
            </span>
          </span>
        </label>
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={bottleOilAllowRation}
            disabled={isLoading || !canWrite || bottleOilSettingSaving}
            onChange={(event) => {
              setBottleOilAllowRation(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setBottleOilSettingSavedHint(null);
            }}
          />
          <span>
            <strong>Allow Ration disposition</strong>
            <span>
              When unchecked (default), Bottle Oil sales hides the Ration option.
              When checked, clerks can mark Bottle Oil invoices as Ration.
              Public relation is always available.
            </span>
          </span>
        </label>
      </section>

      <section class="company-settings-stock-numbering">
        <div class="company-settings-stock-numbering-header">
          <div>
            <h3>Loose sales</h3>
            <p>
              Options for Sales Invoicing (loose product) invoices.
            </p>
          </div>
          {canWrite ? (
            <button
              type="button"
              class="company-settings-primary-btn"
              disabled={isLoading || looseSalesSettingSaving}
              onClick={() => void onSaveLooseSalesSettings()}
            >
              {looseSalesSettingSaving ? "Saving…" : "Save loose sales options"}
            </button>
          ) : null}
        </div>
        {looseSalesSettingSavedHint && !actionError ? (
          <p class="company-settings-stock-numbering-hint">
            {looseSalesSettingSavedHint}
          </p>
        ) : null}
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={looseSalesAllowPublicRelation}
            disabled={isLoading || !canWrite || looseSalesSettingSaving}
            onChange={(event) => {
              setLooseSalesAllowPublicRelation(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setLooseSalesSettingSavedHint(null);
            }}
          />
          <span>
            <strong>Allow Public relation disposition</strong>
            <span>
              When unchecked (default), Sales Invoicing hides Public relation.
              When checked, clerks can mark loose invoices as Public relation.
            </span>
          </span>
        </label>
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={looseSalesAllowUnregisteredCustomer}
            disabled={isLoading || !canWrite || looseSalesSettingSaving}
            onChange={(event) => {
              setLooseSalesAllowUnregisteredCustomer(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setLooseSalesSettingSavedHint(null);
            }}
          />
          <span>
            <strong>Use unregistered customer</strong>
            <span>
              When unchecked (default), Sales Invoicing requires a customer from
              the directory. When checked, clerks enter the customer name on the
              invoice instead (normal disposition only; Ration / Public relation
              always use an invoice name).
            </span>
          </span>
        </label>
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={loosePalmOilRequireSalesTank}
            disabled={isLoading || !canWrite || looseSalesSettingSaving}
            onChange={(event) => {
              setLoosePalmOilRequireSalesTank(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setLooseSalesSettingSavedHint(null);
            }}
          />
          <span>
            <strong>Require sales tank for Loose Palm Oil</strong>
            <span>
              When on (default), Loose Palm Oil invoices only use locations marked
              Sales tank. When off, Palm Oil can use any location with stock.
              Other products always use any location with stock; Palm Kernel /
              Cake never use a location.
            </span>
          </span>
        </label>
      </section>

      <section class="company-settings-stock-numbering">
        <div class="company-settings-stock-numbering-header">
          <div>
            <h3>Stock transfers</h3>
            <p>
              Options for how transfer receive dates affect inventory posting.
            </p>
          </div>
          {canWrite ? (
            <button
              type="button"
              class="company-settings-primary-btn"
              disabled={isLoading || stockTransferSettingSaving}
              onClick={() => void onSaveStockTransferSettings()}
            >
              {stockTransferSettingSaving ? "Saving…" : "Save transfer options"}
            </button>
          ) : null}
        </div>
        {stockTransferSettingSavedHint && !actionError ? (
          <p class="company-settings-stock-numbering-hint">
            {stockTransferSettingSavedHint}
          </p>
        ) : null}
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={loosePalmOilAllowInterSalesPointTransfer}
            disabled={isLoading || !canWrite || stockTransferSettingSaving}
            onChange={(event) => {
              setLoosePalmOilAllowInterSalesPointTransfer(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setStockTransferSettingSavedHint(null);
            }}
          />
          <span>
            <strong>Allow loose Palm Oil transfers between collection points</strong>
            <span>
              When unchecked (default), only bottled products may transfer between
              collection points. Loose Palm Oil and other loose products must use
              Within collection point. When checked, loose Palm Oil may also
              transfer between collection points; other loose products remain
              intra-only.
            </span>
          </span>
        </label>
        <label class="company-settings-stock-numbering-option">
          <input
            type="checkbox"
            checked={stockTransferReceiveUsesDocumentDate}
            disabled={isLoading || !canWrite || stockTransferSettingSaving}
            onChange={(event) => {
              setStockTransferReceiveUsesDocumentDate(
                (event.currentTarget as HTMLInputElement).checked,
              );
              setStockTransferSettingSavedHint(null);
            }}
          />
          <span>
            <strong>Use receive date for stock posting</strong>
            <span>
              When on, transfer receive posts inventory on the Date entered
              (must be in the open financial month). When off (default), stock
              posts at the moment Receive is confirmed; the Date field is
              paperwork only.
            </span>
          </span>
        </label>
      </section>

      {isAdmin && canWrite ? (
        <section class="company-settings-stock-numbering company-settings-danger-zone">
          <div class="company-settings-stock-numbering-header">
            <div>
              <h3>Danger zone</h3>
              <p>
                Permanently delete operational transactions while keeping master
                data (products, customers, users, budgets, permissions, and
                settings).
              </p>
            </div>
            <button
              type="button"
              class="company-settings-delete-btn company-settings-danger-btn"
              disabled={isLoading || clearOpsBusy}
              onClick={openClearOpsModal}
            >
              Clear operational data…
            </button>
          </div>
          <div class="company-settings-danger-copy">
            <p>
              <strong>Deletes:</strong> stock movements and balances; stock
              receipts, transfers, and adjustments; sales (lines, payments, and
              vehicle consignment notes); delivery orders and transfer links.
            </p>
            <p>
              <strong>Resets:</strong> stock document, commercial invoice,
              delivery order, and VCN sequence counters to 1.
            </p>
          </div>
          {clearOpsSuccessHint && !actionError ? (
            <p class="company-settings-stock-numbering-hint">
              {clearOpsSuccessHint}
            </p>
          ) : null}
        </section>
      ) : null}

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

      {clearOpsOpen ? (
        <FormDialog
          ariaLabel="Clear operational data"
          title="Clear operational data"
          onClose={closeClearOpsModal}
        >
          <div class="company-settings-delete company-settings-clear-ops">
            <p>
              This permanently deletes stock, sales, vehicle consignment notes,
              and delivery order data from this database. Master data is kept.
            </p>
            <ul class="company-settings-clear-ops-list">
              <li>StockMovement, StockBalance</li>
              <li>StockReceipt, StockTransfer, StockAdjustment (+ lines)</li>
              <li>Sale (+ lines, taxes, payments, VCN)</li>
              <li>DeliveryOrderTransfer, DeliveryOrder (+ details)</li>
              <li>Document sequences reset to 1</li>
            </ul>
            <label class="company-settings-clear-ops-confirm">
              <span>Type CLEAR to confirm</span>
              <input
                type="text"
                class="company-settings-input"
                value={clearOpsConfirmText}
                disabled={clearOpsBusy}
                autoComplete="off"
                spellcheck={false}
                onInput={(event) =>
                  setClearOpsConfirmText(
                    (event.currentTarget as HTMLInputElement).value,
                  )
                }
              />
            </label>
            {clearOpsError ? (
              <p class="company-settings-error">{clearOpsError}</p>
            ) : null}
            <div class="form-dialog-actions">
              <button
                type="button"
                class="form-dialog-btn-secondary"
                disabled={clearOpsBusy}
                onClick={closeClearOpsModal}
              >
                Cancel
              </button>
              <button
                type="button"
                class="company-settings-delete-btn"
                disabled={clearOpsBusy || clearOpsConfirmText !== "CLEAR"}
                onClick={() => void onConfirmClearOps()}
              >
                {clearOpsBusy ? "Clearing…" : "Clear operational data"}
              </button>
            </div>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
