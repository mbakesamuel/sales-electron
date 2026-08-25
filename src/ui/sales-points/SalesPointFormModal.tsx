import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";

import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface SalesPointFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  isActive: boolean;
  attachedToMill: boolean;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return { name: "", isActive: true, attachedToMill: false };
  }

  return {
    name: row.name != null ? String(row.name) : "",
    isActive: row.isActive === 1 || row.isActive === true || row.isActive == null,
    attachedToMill:
      row.attachedToMill === 1 || row.attachedToMill === true,
  };
}

export function SalesPointFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: SalesPointFormModalProps) {
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
      setError("Collection point name is required.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      name,
      isActive: form.isActive ? 1 : 0,
      attachedToMill: form.attachedToMill ? 1 : 0,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({ table: "SalesPoint", values: payload });
      } else {
        if (row?.id == null) {
          throw new Error("Collection point id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "SalesPoint",
          primaryKey: { id: row.id },
          values: payload,
        });
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to save collection point.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Collection Point" : "Edit Collection Point";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Define a sales outlet location"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sp-name">
            Name
          </label>
          <div class="form-dialog-control">
            <input
              id="sp-name"
              class="form-dialog-input"
              value={form.name}
              disabled={isSubmitting}
              placeholder="e.g. Main Collection Point"
              onInput={(event) =>
                updateField("name", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sp-active">
            Status
          </label>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                id="sp-active"
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
            <p class="form-dialog-hint">
              Inactive collection points stay in history but are hidden when assigning users
              or storage locations.
            </p>
          </div>
        </div>

        <div class="form-dialog-row">
          <span class="form-dialog-label">Mill</span>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                type="checkbox"
                checked={form.attachedToMill}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField(
                    "attachedToMill",
                    (event.currentTarget as HTMLInputElement).checked,
                  )
                }
              />
              Attached to mill
            </label>
            <p class="form-dialog-hint">
              Stock receipts can only be created for collection points attached to a mill.
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
            {isSubmitting ? "Saving…" : mode === "create" ? "Add collection point" : "Save changes"}
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
