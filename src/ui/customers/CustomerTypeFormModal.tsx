import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";

import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface CustomerTypeFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  code: string;
  name: string;
  sortOrder: string;
  isActive: boolean;
  exemptFromSalesTax: boolean;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return {
      code: "",
      name: "",
      sortOrder: "0",
      isActive: true,
      exemptFromSalesTax: false,
    };
  }

  return {
    code: row.code != null ? String(row.code) : "",
    name: row.name != null ? String(row.name) : "",
    sortOrder: row.sortOrder != null ? String(row.sortOrder) : "0",
    isActive: row.isActive === 1 || row.isActive === true,
    exemptFromSalesTax:
      row.exemptFromSalesTax === 1 || row.exemptFromSalesTax === true,
  };
}

export function CustomerTypeFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: CustomerTypeFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSystem =
    mode === "edit" && (row?.isSystem === 1 || row?.isSystem === true);
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
    const sortOrder = Number.parseInt(form.sortOrder, 10);

    if (!code) {
      setError("Code is required.");
      return;
    }
    if (!name) {
      setError("Name is required.");
      return;
    }
    if (Number.isNaN(sortOrder)) {
      setError("Sort order must be a number.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      code,
      name,
      sortOrder,
      isActive: form.isActive ? 1 : 0,
      exemptFromSalesTax: form.exemptFromSalesTax ? 1 : 0,
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "CustomerTypeDefinition",
          values: payload,
        });
      } else {
        if (!row?.id) {
          throw new Error("Customer type id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "CustomerTypeDefinition",
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
          : "Failed to save customer type.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Customer Type" : "Edit Customer Type";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle={
        isSystem
          ? "System type — code and name are read-only"
          : "Define a customer classification used across accounts"
      }
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="ct-code">
            Code
          </label>
          <div class="form-dialog-control">
            <input
              id="ct-code"
              class="form-dialog-input"
              value={form.code}
              disabled={isSubmitting || isSystem}
              placeholder="e.g. RETAIL"
              onInput={(event) =>
                updateField("code", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="ct-name">
            Name
          </label>
          <div class="form-dialog-control">
            <input
              id="ct-name"
              class="form-dialog-input"
              value={form.name}
              disabled={isSubmitting || isSystem}
              placeholder="e.g. Retail"
              onInput={(event) =>
                updateField("name", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="ct-sort">
            Sort order
          </label>
          <div class="form-dialog-control">
            <input
              id="ct-sort"
              type="number"
              class="form-dialog-input"
              value={form.sortOrder}
              disabled={isSubmitting}
              onInput={(event) =>
                updateField("sortOrder", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-checkbox-label">
            <input
              type="checkbox"
              checked={form.exemptFromSalesTax}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "exemptFromSalesTax",
                  (event.currentTarget as HTMLInputElement).checked,
                )
              }
            />
            Exempt from sales tax
          </label>
          <p class="form-dialog-hint">
            Customers of this type are not charged sales tax on invoices and delivery
            orders. VAT still applies for local customers.
          </p>
        </div>

        <div class="form-dialog-row">
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
            Active
          </label>
        </div>

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : mode === "create" ? "Add type" : "Save changes"}
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
