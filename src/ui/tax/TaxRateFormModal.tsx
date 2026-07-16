import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";
import {
  normalizeTaxRateDecimal,
  TAX_RATE_KIND_LABELS,
  TAX_RATE_KINDS,
  type TaxRateKind,
} from "../../shared/taxRules.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface TaxRateFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  rateKind: TaxRateKind;
  ratePercent: string;
  effectiveFrom: string;
}

function toPercentInput(stored: string | number | null | undefined): string {
  const decimal = normalizeTaxRateDecimal(stored);
  return String(Number((decimal * 100).toFixed(4)));
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return {
      rateKind: "VAT",
      ratePercent: "19.25",
      effectiveFrom: todayIsoDate(),
    };
  }

  const kind = String(row.rateKind ?? "VAT").toUpperCase() as TaxRateKind;
  return {
    rateKind: TAX_RATE_KINDS.includes(kind) ? kind : "VAT",
    ratePercent: toPercentInput(row.rate as string | number | null),
    effectiveFrom: String(row.effectiveFrom ?? todayIsoDate()).slice(0, 10),
  };
}

export function TaxRateFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: TaxRateFormModalProps) {
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

    const percent = Number.parseFloat(form.ratePercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError("Rate must be a percent from 0 to 100.");
      return;
    }

    const effectiveFrom = form.effectiveFrom.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      setError("Effective from must be YYYY-MM-DD.");
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const payload: Record<string, unknown> = {
      rateKind: form.rateKind,
      rate: String(percent / 100),
      effectiveFrom,
      updatedAt: now,
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "TaxRateSchedule",
          values: { ...payload, createdAt: now },
        });
      } else {
        if (!row?.id) {
          throw new Error("Tax rate id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "TaxRateSchedule",
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
          : "Failed to save tax rate.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Tax Rate" : "Edit Tax Rate";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Date-effective VAT and sales-tax percentages"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="tax-rate-kind">
            Rate kind
          </label>
          <div class="form-dialog-control">
            <select
              id="tax-rate-kind"
              class="form-dialog-input"
              value={form.rateKind}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "rateKind",
                  (event.currentTarget as HTMLSelectElement).value as TaxRateKind,
                )
              }
            >
              {TAX_RATE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {TAX_RATE_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="tax-rate-percent">
            Rate (%)
          </label>
          <div class="form-dialog-control">
            <input
              id="tax-rate-percent"
              class="form-dialog-input"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.ratePercent}
              disabled={isSubmitting}
              onInput={(event) =>
                updateField(
                  "ratePercent",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="tax-rate-from">
            Effective from
          </label>
          <div class="form-dialog-control">
            <input
              id="tax-rate-from"
              class="form-dialog-input"
              type="date"
              value={form.effectiveFrom}
              disabled={isSubmitting}
              onInput={(event) =>
                updateField(
                  "effectiveFrom",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
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
