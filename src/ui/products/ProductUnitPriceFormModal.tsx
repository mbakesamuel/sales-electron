import { useEffect, useMemo, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";

import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface ProductUnitPriceFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface LookupOption {
  id: string;
  label: string;
}

interface FormData {
  productId: string;
  unitPriceExTax: string;
  effectiveFrom: string;
  customerTypeId: string;
}

function buildLabel(row: Record<string, unknown>, columns: string[]): string {
  for (const column of columns) {
    const value = row[column];
    if (value != null && String(value).trim()) {
      return String(value);
    }
  }
  return String(row.id ?? row.productId ?? "");
}

function formatDateInput(value: unknown): string {
  if (value == null || value === "") {
    return "";
  }
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return {
      productId: "",
      unitPriceExTax: "",
      effectiveFrom: new Date().toISOString().slice(0, 10),
      customerTypeId: "",
    };
  }

  return {
    productId: row.productId != null ? String(row.productId) : "",
    unitPriceExTax: row.unitPriceExTax != null ? String(row.unitPriceExTax) : "",
    effectiveFrom: formatDateInput(row.effectiveFrom),
    customerTypeId: row.customerTypeId != null ? String(row.customerTypeId) : "",
  };
}

export function ProductUnitPriceFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: ProductUnitPriceFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [products, setProducts] = useState<LookupOption[]>([]);
  const [customerTypes, setCustomerTypes] = useState<LookupOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rowKey = useMemo(() => buildRowKey(row, ["id"]), [row]);

  useEffect(() => {
    setForm(initForm(mode, row));
    setError(null);
  }, [mode, rowKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      try {
        const api = getElectronApi();
        const [productResult, typeResult] = await Promise.all([
          api.db.queryTable({ table: "Product", limit: 500 }),
          api.db.queryTable({ table: "CustomerTypeDefinition", limit: 200 }),
        ]);

        if (cancelled) {
          return;
        }

        setProducts(
          productResult.rows
            .map((optionRow) => ({
              id: String(optionRow.productId ?? ""),
              label: buildLabel(optionRow, ["productName", "productCode"]),
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
        );
        setCustomerTypes(
          typeResult.rows
            .map((optionRow) => ({
              id: String(optionRow.id ?? ""),
              label: buildLabel(optionRow, ["name", "code"]),
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
        );
      } catch {
        // Selects fall back to current values only.
      }
    }

    void loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setError(null);

    const productId = Number.parseInt(form.productId, 10);
    const unitPriceExTax = form.unitPriceExTax.trim();
    const effectiveFrom = form.effectiveFrom.trim();

    if (!form.productId || Number.isNaN(productId)) {
      setError("Product is required.");
      return;
    }
    if (!unitPriceExTax || Number.isNaN(Number(unitPriceExTax))) {
      setError("Unit price must be a valid number.");
      return;
    }
    if (!effectiveFrom) {
      setError("Effective from date is required.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      productId,
      unitPriceExTax,
      effectiveFrom,
      customerTypeId: form.customerTypeId || null,
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "ProductUnitPriceSchedule",
          values: payload,
        });
      } else {
        if (!row?.id) {
          throw new Error("Price schedule id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "ProductUnitPriceSchedule",
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
          : "Failed to save unit price.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Unit Price" : "Edit Unit Price";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Set product pricing effective from a date, optionally per customer type"
      wide
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="price-product">
            Product
          </label>
          <div class="form-dialog-control">
            <select
              id="price-product"
              class="form-dialog-input"
              value={form.productId}
              disabled={isSubmitting}
              required
              onChange={(event) =>
                updateField("productId", (event.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="">Select product…</option>
              {products.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="price-amount">
            Unit price (ex tax)
          </label>
          <div class="form-dialog-control">
            <input
              id="price-amount"
              type="number"
              min="0"
              step="0.01"
              class="form-dialog-input"
              value={form.unitPriceExTax}
              disabled={isSubmitting}
              placeholder="e.g. 500"
              onInput={(event) =>
                updateField(
                  "unitPriceExTax",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="price-effective">
            Effective from
          </label>
          <div class="form-dialog-control">
            <input
              id="price-effective"
              type="date"
              class="form-dialog-input"
              value={form.effectiveFrom}
              disabled={isSubmitting}
              required
              onInput={(event) =>
                updateField(
                  "effectiveFrom",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="price-customer-type">
            Customer type
          </label>
          <div class="form-dialog-control">
            <select
              id="price-customer-type"
              class="form-dialog-input"
              value={form.customerTypeId}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "customerTypeId",
                  (event.currentTarget as HTMLSelectElement).value,
                )
              }
            >
              <option value="">Direct / all types</option>
              {customerTypes.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <p class="form-dialog-hint">
              Leave blank for a direct price not tied to a customer type.
            </p>
          </div>
        </div>

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : mode === "create" ? "Add price" : "Save changes"}
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
