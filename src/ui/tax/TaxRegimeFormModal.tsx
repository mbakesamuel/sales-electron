import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";
import {
  TAX_REGIME_KIND_LABELS,
  type TaxRegimeKind,
} from "../../shared/taxRules.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface TaxRegimeFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  kind: TaxRegimeKind;
}

const KIND_OPTIONS = Object.keys(TAX_REGIME_KIND_LABELS) as TaxRegimeKind[];

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return { name: "", kind: "SIMPLIFIED" };
  }

  const kind = String(row.kind ?? "SIMPLIFIED").toUpperCase();
  return {
    name: row.name != null ? String(row.name) : "",
    kind: kind === "REAL" ? "REAL" : "SIMPLIFIED",
  };
}

export function TaxRegimeFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: TaxRegimeFormModalProps) {
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

    const name = form.name.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const payload: Record<string, unknown> = {
      name,
      kind: form.kind,
      updatedAt: now,
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "TaxRegime",
          values: { ...payload, createdAt: now },
        });
      } else {
        if (!row?.id) {
          throw new Error("Tax regime id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "TaxRegime",
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
          : "Failed to save tax regime.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Tax Regime" : "Edit Tax Regime";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Actual vs Simplified — used for sales-tax rate selection"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="tax-regime-name">
            Name
          </label>
          <div class="form-dialog-control">
            <input
              id="tax-regime-name"
              class="form-dialog-input"
              value={form.name}
              disabled={isSubmitting}
              placeholder="e.g. Actual"
              onInput={(event) =>
                updateField("name", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="tax-regime-kind">
            Kind
          </label>
          <div class="form-dialog-control">
            <select
              id="tax-regime-kind"
              class="form-dialog-input"
              value={form.kind}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "kind",
                  (event.currentTarget as HTMLSelectElement).value as TaxRegimeKind,
                )
              }
            >
              {KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {TAX_REGIME_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button type="button" class="form-dialog-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </FormDialog>
  );
}
