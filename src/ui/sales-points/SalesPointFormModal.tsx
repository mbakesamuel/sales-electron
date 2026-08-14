import { useEffect, useMemo, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";

import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface MillOption {
  id: number;
  name: string;
}

interface SalesPointFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  millId: string;
  isActive: boolean;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return { name: "", millId: "", isActive: true };
  }

  return {
    name: row.name != null ? String(row.name) : "",
    millId: row.millId != null && row.millId !== "" ? String(row.millId) : "",
    isActive: row.isActive === 1 || row.isActive === true || row.isActive == null,
  };
}

export function SalesPointFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: SalesPointFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [mills, setMills] = useState<MillOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rowKey = useMemo(() => buildRowKey(row, ["id"]), [row]);

  useEffect(() => {
    setForm(initForm(mode, row));
    setError(null);
  }, [mode, rowKey]);

  useEffect(() => {
    let cancelled = false;
    const selectedMillId =
      row?.millId != null && row.millId !== "" ? Number(row.millId) : null;

    void getElectronApi()
      .db.queryTable({ table: "Mill", limit: 200 })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setMills(
          result.rows
            .filter((millRow) => {
              const isActive =
                millRow.isActive === 1 ||
                millRow.isActive === true ||
                millRow.isActive == null;
              const millId = Number(millRow.id);
              return isActive || (selectedMillId != null && millId === selectedMillId);
            })
            .map((millRow) => {
              const isActive =
                millRow.isActive === 1 ||
                millRow.isActive === true ||
                millRow.isActive == null;
              const name = String(millRow.name ?? `Mill ${millRow.id}`);
              return {
                id: Number(millRow.id),
                name: isActive ? name : `${name} (inactive)`,
              };
            }),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMills([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [row?.millId]);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    if (!name) {
      setError("Sales point name is required.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      name,
      millId: form.millId.trim() ? Number.parseInt(form.millId, 10) : null,
      isActive: form.isActive ? 1 : 0,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({ table: "SalesPoint", values: payload });
      } else {
        if (row?.id == null) {
          throw new Error("Sales point id is missing.");
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
        submitError instanceof Error ? submitError.message : "Failed to save sales point.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Sales Point" : "Edit Sales Point";

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
              placeholder="e.g. Main Sales Point"
              onInput={(event) =>
                updateField("name", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sp-mill">
            Mill
          </label>
          <div class="form-dialog-control">
            <select
              id="sp-mill"
              class="form-dialog-input"
              value={form.millId}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField("millId", (event.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="">No mill linked</option>
              {mills.map((mill) => (
                <option key={mill.id} value={String(mill.id)}>
                  {mill.name}
                </option>
              ))}
            </select>
            <p class="form-dialog-hint">Optional link to a mill site.</p>
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
              Inactive sales points stay in history but are hidden when assigning users
              or storage locations.
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
            {isSubmitting ? "Saving…" : mode === "create" ? "Add sales point" : "Save changes"}
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
