import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";
import type { PaymentMethodKind } from "../../shared/sales.types.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface PaymentMethodFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  code: string;
  name: string;
  kind: PaymentMethodKind;
  sortOrder: string;
  isActive: boolean;
}

export const PAYMENT_METHOD_KIND_LABELS: Record<PaymentMethodKind, string> = {
  SIMPLE: "Simple",
  CHEQUE: "Cheque",
  TRAITE: "Traite",
  CREDIT: "Credit",
  BANK_TRANSFER: "Bank transfer",
};

const KIND_OPTIONS = Object.keys(PAYMENT_METHOD_KIND_LABELS) as PaymentMethodKind[];

function normalizeKind(value: unknown): PaymentMethodKind {
  const kind = String(value ?? "SIMPLE").toUpperCase();
  if (
    kind === "CHEQUE" ||
    kind === "TRAITE" ||
    kind === "CREDIT" ||
    kind === "BANK_TRANSFER"
  ) {
    return kind;
  }
  return "SIMPLE";
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return {
      code: "",
      name: "",
      kind: "SIMPLE",
      sortOrder: "0",
      isActive: true,
    };
  }

  return {
    code: row.code != null ? String(row.code) : "",
    name: row.name != null ? String(row.name) : "",
    kind: normalizeKind(row.kind),
    sortOrder: row.sortOrder != null ? String(row.sortOrder) : "0",
    isActive: row.isActive === 1 || row.isActive === true,
  };
}

export function PaymentMethodFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: PaymentMethodFormModalProps) {
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
      kind: form.kind,
      sortOrder,
      isActive: form.isActive ? 1 : 0,
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "PaymentMethodDefinition",
          values: { ...payload, isSystem: 0 },
        });
      } else {
        if (!row?.id) {
          throw new Error("Payment method id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "PaymentMethodDefinition",
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
          : "Failed to save payment method.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Payment Method" : "Edit Payment Method";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle={
        isSystem
          ? "System method — code, name, and kind are read-only"
          : "Define how customers can pay on sales and delivery orders"
      }
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="pm-code">
            Code
          </label>
          <div class="form-dialog-control">
            <input
              id="pm-code"
              class="form-dialog-input"
              value={form.code}
              disabled={isSubmitting || isSystem}
              placeholder="e.g. CASH"
              onInput={(event) =>
                updateField("code", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="pm-name">
            Name
          </label>
          <div class="form-dialog-control">
            <input
              id="pm-name"
              class="form-dialog-input"
              value={form.name}
              disabled={isSubmitting || isSystem}
              placeholder="e.g. Cash"
              onInput={(event) =>
                updateField("name", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="pm-kind">
            Kind
          </label>
          <div class="form-dialog-control">
            <select
              id="pm-kind"
              class="form-dialog-input"
              value={form.kind}
              disabled={isSubmitting || isSystem}
              onChange={(event) =>
                updateField(
                  "kind",
                  (event.currentTarget as HTMLSelectElement).value as PaymentMethodKind,
                )
              }
            >
              {KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {PAYMENT_METHOD_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            <p class="form-dialog-hint">
              Cheque methods collect bank details. Credit is excluded from POS payment
              pickers.
            </p>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="pm-sort">
            Sort order
          </label>
          <div class="form-dialog-control">
            <input
              id="pm-sort"
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

        <div class="form-dialog-row form-dialog-row-center">
          <span class="form-dialog-label">Status</span>
          <div class="form-dialog-control">
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
        </div>

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : mode === "create" ? "Add method" : "Save changes"}
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
