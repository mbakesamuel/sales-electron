import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface CommercialServiceFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  code: string;
  name: string;
  invoicePrefix: string;
  phone: string;
  address: string;
  siteKind: "SALES_POINT" | "FACTORY";
  sortOrder: string;
  isActive: boolean;
  enabledModules: string;
}

const SITE_KIND_OPTIONS = [
  { value: "SALES_POINT", label: "Sales point" },
  { value: "FACTORY", label: "Factory" },
] as const;

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return {
      code: "",
      name: "",
      invoicePrefix: "",
      phone: "",
      address: "",
      siteKind: "SALES_POINT",
      sortOrder: "0",
      isActive: true,
      enabledModules: "[]",
    };
  }

  return {
    code: row.code != null ? String(row.code) : "",
    name: row.name != null ? String(row.name) : "",
    invoicePrefix: row.invoicePrefix != null ? String(row.invoicePrefix) : "",
    phone: row.phone != null ? String(row.phone) : "",
    address: row.address != null ? String(row.address) : "",
    siteKind: row.siteKind === "FACTORY" ? "FACTORY" : "SALES_POINT",
    sortOrder: row.sortOrder != null ? String(row.sortOrder) : "0",
    isActive: row.isActive === 1 || row.isActive === true,
    enabledModules:
      row.enabledModules != null ? String(row.enabledModules) : "[]",
  };
}

function parseEnabledModules(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "[]";
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Enabled modules must be a JSON array.");
  }

  return JSON.stringify(parsed);
}

export function CommercialServiceFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: CommercialServiceFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rowKey = useMemo(() => buildRowKey(row, ["id"]), [row]);

  useEffect(() => {
    setForm(initForm(mode, row));
    setError(null);
  }, [mode, rowKey]);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setError(null);

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const invoicePrefix = form.invoicePrefix.trim().toUpperCase();

    if (!code) {
      setError("Service code is required.");
      return;
    }

    if (!name) {
      setError("Service name is required.");
      return;
    }

    if (!invoicePrefix) {
      setError("Invoice prefix is required.");
      return;
    }

    let enabledModules = "[]";
    try {
      enabledModules = parseEnabledModules(form.enabledModules);
    } catch (modulesError) {
      setError(
        modulesError instanceof Error
          ? modulesError.message
          : "Enabled modules must be valid JSON.",
      );
      return;
    }

    const sortOrder = Number.parseInt(form.sortOrder, 10);
    if (!Number.isFinite(sortOrder)) {
      setError("Sort order must be a number.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      code,
      name,
      invoicePrefix,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      siteKind: form.siteKind,
      sortOrder,
      isActive: form.isActive ? 1 : 0,
      enabledModules,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "CommercialService",
          values: payload,
        });
      } else {
        if (row?.id == null) {
          throw new Error("Commercial service id is missing.");
        }

        await getAuthenticatedDb().updateRow({
          table: "CommercialService",
          primaryKey: { id: row.id },
          values: payload,
        });
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save commercial service.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    mode === "create" ? "Add Commercial Service" : "Edit Commercial Service";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Configure a commercial service site"
      wide
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="cs-code">
            Code *
          </label>
          <div class="form-dialog-control">
            <input
              id="cs-code"
              class="form-dialog-input"
              value={form.code}
              disabled={isSubmitting || mode === "edit"}
              placeholder="e.g. MAIN"
              onInput={(event) =>
                updateField("code", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="cs-name">
            Name *
          </label>
          <div class="form-dialog-control">
            <input
              id="cs-name"
              class="form-dialog-input"
              value={form.name}
              disabled={isSubmitting}
              placeholder="e.g. Main Commercial Service"
              onInput={(event) =>
                updateField("name", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="cs-prefix">
            Invoice prefix *
          </label>
          <div class="form-dialog-control">
            <input
              id="cs-prefix"
              class="form-dialog-input"
              value={form.invoicePrefix}
              disabled={isSubmitting}
              placeholder="e.g. INV"
              onInput={(event) =>
                updateField(
                  "invoicePrefix",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="cs-site-kind">
            Site kind
          </label>
          <div class="form-dialog-control">
            <select
              id="cs-site-kind"
              class="form-dialog-input"
              value={form.siteKind}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "siteKind",
                  (event.currentTarget as HTMLSelectElement).value as FormData["siteKind"],
                )
              }
            >
              {SITE_KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="cs-sort-order">
            Sort order
          </label>
          <div class="form-dialog-control">
            <input
              id="cs-sort-order"
              class="form-dialog-input"
              type="number"
              value={form.sortOrder}
              disabled={isSubmitting}
              onInput={(event) =>
                updateField(
                  "sortOrder",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="cs-phone">
            Phone
          </label>
          <div class="form-dialog-control">
            <input
              id="cs-phone"
              class="form-dialog-input"
              value={form.phone}
              disabled={isSubmitting}
              onInput={(event) =>
                updateField("phone", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row-stretch">
          <label class="form-dialog-label" for="cs-address">
            Address
          </label>
          <textarea
            id="cs-address"
            class="form-dialog-input"
            rows={2}
            value={form.address}
            disabled={isSubmitting}
            onInput={(event) =>
              updateField("address", (event.currentTarget as HTMLTextAreaElement).value)
            }
          />
        </div>

        <div class="form-dialog-row-stretch">
          <label class="form-dialog-label" for="cs-modules">
            Enabled modules (JSON)
          </label>
          <textarea
            id="cs-modules"
            class="form-dialog-input"
            rows={3}
            value={form.enabledModules}
            disabled={isSubmitting}
            onInput={(event) =>
              updateField(
                "enabledModules",
                (event.currentTarget as HTMLTextAreaElement).value,
              )
            }
          />
          <p class="form-dialog-hint">JSON array of module keys, e.g. ["sales","inventory"]</p>
        </div>

        <div class="form-dialog-row form-dialog-row-center">
          <span class="form-dialog-label">Active</span>
          <label class="form-dialog-checkbox-label">
            <input
              type="checkbox"
              checked={form.isActive}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "isActive",
                  (event.currentTarget as HTMLInputElement).checked,
                )
              }
            />
            Service is active
          </label>
        </div>

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving…"
              : mode === "create"
                ? "Add service"
                : "Save changes"}
          </button>
          <button
            type="button"
            class="form-dialog-btn-secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </FormDialog>
  );
}
