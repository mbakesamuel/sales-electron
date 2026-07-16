import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";

import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface CategoryFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  productCat: string;
  productCode: string;
  isMain: boolean;
  isBottled: boolean;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return { productCat: "", productCode: "", isMain: false, isBottled: false };
  }

  return {
    productCat: row.productCat != null ? String(row.productCat) : "",
    productCode: row.productCode != null ? String(row.productCode) : "",
    isMain: row.isMain === 1 || row.isMain === true,
    isBottled: row.isBottled === 1 || row.isBottled === true,
  };
}

export function CategoryFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rowKey = useMemo(() => buildRowKey(row, ["productCatId"]), [row]);

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

    const productCat = form.productCat.trim();
    const productCode = form.productCode.trim().toUpperCase();

    if (!productCat) {
      setError("Category name is required.");
      return;
    }
    if (!productCode) {
      setError("Category code is required.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      productCat,
      productCode,
      isMain: form.isMain ? 1 : 0,
      isBottled: form.isBottled ? 1 : 0,
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({ table: "ProductCat", values: payload });
      } else {
        if (row?.productCatId == null) {
          throw new Error("Category id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "ProductCat",
          primaryKey: { productCatId: row.productCatId },
          values: payload,
        });
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to save category.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Category" : "Edit Category";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Define product grouping, code, and catalog flags"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="cat-name">
            Category name
          </label>
          <div class="form-dialog-control">
            <input
              id="cat-name"
              class="form-dialog-input"
              value={form.productCat}
              disabled={isSubmitting}
              placeholder="e.g. Palm Oil"
              onInput={(event) =>
                updateField("productCat", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="cat-code">
            Category code
          </label>
          <div class="form-dialog-control">
            <input
              id="cat-code"
              class="form-dialog-input"
              value={form.productCode}
              disabled={isSubmitting}
              placeholder="e.g. PO"
              onInput={(event) =>
                updateField("productCode", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <span class="form-dialog-label">Main category</span>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                type="checkbox"
                checked={form.isMain}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField("isMain", (event.currentTarget as HTMLInputElement).checked)
                }
              />
              Mark as the main product category
            </label>
            <p class="form-dialog-hint">Only one category can be marked as main.</p>
          </div>
        </div>

        <div class="form-dialog-row">
          <span class="form-dialog-label">Bottled category</span>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                type="checkbox"
                checked={form.isBottled}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField("isBottled", (event.currentTarget as HTMLInputElement).checked)
                }
              />
              Mark as the bottled product category
            </label>
            <p class="form-dialog-hint">Only one category can be marked as bottled.</p>
          </div>
        </div>

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : mode === "create" ? "Add category" : "Save changes"}
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
