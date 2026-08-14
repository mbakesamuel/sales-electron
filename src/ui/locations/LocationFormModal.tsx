import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";

import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface LocationFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  locationName: string;
  isActive: boolean;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return { locationName: "", isActive: true };
  }

  return {
    locationName: row.locationName != null ? String(row.locationName) : "",
    isActive: row.isActive === 1 || row.isActive === true || row.isActive == null,
  };
}

export function LocationFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: LocationFormModalProps) {
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

    const locationName = form.locationName.trim();
    if (!locationName) {
      setError("Location name is required.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      locationName,
      isActive: form.isActive ? 1 : 0,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({ table: "Location", values: payload });
      } else {
        if (row?.id == null) {
          throw new Error("Location id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "Location",
          primaryKey: { id: row.id },
          values: payload,
        });
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to save location.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Location" : "Edit Location";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Define a reusable location name"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="location-name">
            Location name
          </label>
          <div class="form-dialog-control">
            <input
              id="location-name"
              class="form-dialog-input"
              value={form.locationName}
              disabled={isSubmitting}
              placeholder="e.g. Main Store"
              onInput={(event) =>
                updateField(
                  "locationName",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="location-active">
            Status
          </label>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                id="location-active"
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
              Inactive locations stay in history but are hidden when linking storage
              locations.
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
            {isSubmitting ? "Saving…" : mode === "create" ? "Add location" : "Save changes"}
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
