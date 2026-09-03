import { useEffect, useMemo, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface TransportRateFormModalProps {
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
  salesPointId: string;
  productId: string;
  ratePerKg: string;
  effectiveFrom: string;
}

function buildLabel(row: Record<string, unknown>, columns: string[]): string {
  for (const column of columns) {
    const value = row[column];
    if (value != null && String(value).trim()) {
      return String(value);
    }
  }
  return String(row.id ?? "");
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
      salesPointId: "",
      productId: "",
      ratePerKg: "",
      effectiveFrom: new Date().toISOString().slice(0, 10),
    };
  }

  return {
    salesPointId: row.salesPointId != null ? String(row.salesPointId) : "",
    productId: row.productId != null ? String(row.productId) : "",
    ratePerKg: row.ratePerKg != null ? String(row.ratePerKg) : "",
    effectiveFrom: formatDateInput(row.effectiveFrom),
  };
}

export function TransportRateFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: TransportRateFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [salesPoints, setSalesPoints] = useState<LookupOption[]>([]);
  const [products, setProducts] = useState<LookupOption[]>([]);
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
        const [salesPointResult, productResult] = await Promise.all([
          api.db.queryTable({ table: "SalesPoint", limit: 500 }),
          api.db.queryTable({ table: "Product", limit: 500 }),
        ]);

        if (cancelled) {
          return;
        }

        setSalesPoints(
          salesPointResult.rows
            .filter((optionRow) => optionRow.isActive !== 0)
            .map((optionRow) => ({
              id: String(optionRow.id ?? ""),
              label: buildLabel(optionRow, ["name"]),
            }))
            .sort((left, right) => left.label.localeCompare(right.label)),
        );

        const productCatResult = await api.db.queryTable({
          table: "ProductCat",
          limit: 200,
        });
        const bottledCatIds = new Set(
          productCatResult.rows
            .filter((catRow) => catRow.isBottled === 1)
            .map((catRow) => String(catRow.productCatId)),
        );

        setProducts(
          productResult.rows
            .filter((optionRow) => {
              const catId =
                optionRow.productCatId != null ? String(optionRow.productCatId) : "";
              return !bottledCatIds.has(catId) && optionRow.excludeFromSales !== 1;
            })
            .map((optionRow) => ({
              id: String(optionRow.productId ?? ""),
              label: buildLabel(optionRow, ["productName", "productCode"]),
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

    const salesPointId = Number.parseInt(form.salesPointId, 10);
    const productId = Number.parseInt(form.productId, 10);
    const ratePerKg = form.ratePerKg.trim();
    const effectiveFrom = form.effectiveFrom.trim();

    if (!form.salesPointId || Number.isNaN(salesPointId)) {
      setError("Collection point is required.");
      return;
    }
    if (!form.productId || Number.isNaN(productId)) {
      setError("Product is required.");
      return;
    }
    if (!ratePerKg || Number.isNaN(Number(ratePerKg)) || Number(ratePerKg) < 0) {
      setError("Rate per kg must be a valid non-negative number.");
      return;
    }
    if (!effectiveFrom) {
      setError("Effective from date is required.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      salesPointId,
      productId,
      ratePerKg,
      effectiveFrom,
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "TransportRateSchedule",
          values: payload,
        });
      } else {
        if (!row?.id) {
          throw new Error("Transport rate id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "TransportRateSchedule",
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
          : "Failed to save transport rate.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Transport Rate" : "Edit Transport Rate";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Set transport cost per kg for a collection point and product"
      wide
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="transport-sales-point">
            Collection point
          </label>
          <div class="form-dialog-control">
            <select
              id="transport-sales-point"
              class="form-dialog-input"
              value={form.salesPointId}
              disabled={isSubmitting}
              required
              onChange={(event) =>
                updateField(
                  "salesPointId",
                  (event.currentTarget as HTMLSelectElement).value,
                )
              }
            >
              <option value="">Select collection point…</option>
              {salesPoints.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="transport-product">
            Product
          </label>
          <div class="form-dialog-control">
            <select
              id="transport-product"
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
            <p class="form-dialog-hint">
              Bulk products only (loose palm oil, sludge grades, palm kernel, etc.).
            </p>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="transport-rate">
            Rate per kg
          </label>
          <div class="form-dialog-control">
            <input
              id="transport-rate"
              type="number"
              min="0"
              step="0.01"
              class="form-dialog-input"
              value={form.ratePerKg}
              disabled={isSubmitting}
              placeholder="e.g. 25"
              required
              onInput={(event) =>
                updateField("ratePerKg", (event.currentTarget as HTMLInputElement).value)
              }
            />
            <p class="form-dialog-hint">Amount in XAF per kilogram lifted.</p>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="transport-effective">
            Effective from
          </label>
          <div class="form-dialog-control">
            <input
              id="transport-effective"
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
            <p class="form-dialog-hint">
              Applies to lifts on or after this date at the selected collection point.
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
            {isSubmitting ? "Saving…" : mode === "create" ? "Add rate" : "Save changes"}
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
