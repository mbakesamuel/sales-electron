import { useEffect, useMemo, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface SalesPointOption {
  id: number;
  name: string;
}

interface LocationOption {
  id: number;
  locationName: string;
}

interface StorageLocationFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  locationId: string;
  salesPointId: string;
  isDefault: boolean;
  isSellable: boolean;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return { locationId: "", salesPointId: "", isDefault: false, isSellable: true };
  }

  return {
    locationId:
      row.locationId != null && row.locationId !== "" ? String(row.locationId) : "",
    salesPointId:
      row.salesPointId != null && row.salesPointId !== ""
        ? String(row.salesPointId)
        : "",
    isDefault: row.isDefault === 1 || row.isDefault === true,
    isSellable: row.isSellable !== 0 && row.isSellable !== false,
  };
}

export function StorageLocationFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: StorageLocationFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [salesPoints, setSalesPoints] = useState<SalesPointOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rowKey = useMemo(() => buildRowKey(row, ["id"]), [row]);

  useEffect(() => {
    setForm(initForm(mode, row));
    setError(null);
  }, [mode, rowKey]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const api = getElectronApi();
        const [salesPointResult, locationResult] = await Promise.all([
          api.db.queryTable({ table: "SalesPoint", limit: 200 }),
          api.db.queryTable({ table: "Location", limit: 500 }),
        ]);

        if (cancelled) {
          return;
        }

        setSalesPoints(
          salesPointResult.rows.map((spRow) => ({
            id: Number(spRow.id),
            name: String(spRow.name ?? `Sales point ${spRow.id}`),
          })),
        );
        setLocations(
          locationResult.rows.map((locationRow) => ({
            id: Number(locationRow.id),
            locationName: String(locationRow.locationName ?? `Location ${locationRow.id}`),
          })),
        );
      } catch {
        if (!cancelled) {
          setSalesPoints([]);
          setLocations([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function clearOtherDefaults(salesPointId: number, exceptId?: number) {
    const api = getElectronApi();
    const result = await api.db.queryTable({ table: "StorageLocation", limit: 500 });
    const updates = result.rows.filter((item) => {
      if (Number(item.salesPointId) !== salesPointId) {
        return false;
      }
      if (exceptId != null && Number(item.id) === exceptId) {
        return false;
      }
      return item.isDefault === 1 || item.isDefault === true;
    });

    for (const item of updates) {
      await getAuthenticatedDb().updateRow({
        table: "StorageLocation",
        primaryKey: { id: item.id },
        values: {
          isDefault: 0,
          updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        },
      });
    }
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setError(null);

    const locationId = Number.parseInt(form.locationId, 10);
    const salesPointId = Number.parseInt(form.salesPointId, 10);

    if (!Number.isFinite(locationId)) {
      setError("Select a location.");
      return;
    }
    if (!Number.isFinite(salesPointId)) {
      setError("Select a sales point.");
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      locationId,
      salesPointId,
      isDefault: form.isDefault ? 1 : 0,
      isSellable: form.isSellable ? 1 : 0,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    try {
      if (form.isDefault) {
        await clearOtherDefaults(
          salesPointId,
          mode === "edit" && row?.id != null ? Number(row.id) : undefined,
        );
      }

      if (mode === "create") {
        await getAuthenticatedDb().insertRow({ table: "StorageLocation", values: payload });
      } else {
        if (row?.id == null) {
          throw new Error("Storage location id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "StorageLocation",
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
          : "Failed to save storage location.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add Storage Location" : "Edit Storage Location";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Assign a location to a sales point"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sl-location">
            Location
          </label>
          <div class="form-dialog-control">
            <select
              id="sl-location"
              class="form-dialog-input"
              value={form.locationId}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField("locationId", (event.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="">Select a location</option>
              {locations.map((location) => (
                <option key={location.id} value={String(location.id)}>
                  {location.locationName}
                </option>
              ))}
            </select>
            <p class="form-dialog-hint">
              Manage location names under Locations in the sidebar.
            </p>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sl-sales-point">
            Sales point
          </label>
          <div class="form-dialog-control">
            <select
              id="sl-sales-point"
              class="form-dialog-input"
              value={form.salesPointId}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "salesPointId",
                  (event.currentTarget as HTMLSelectElement).value,
                )
              }
            >
              <option value="">Select a sales point</option>
              {salesPoints.map((salesPoint) => (
                <option key={salesPoint.id} value={String(salesPoint.id)}>
                  {salesPoint.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-dialog-row">
          <span class="form-dialog-label">Default location</span>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                type="checkbox"
                checked={form.isDefault}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField("isDefault", (event.currentTarget as HTMLInputElement).checked)
                }
              />
              Use as the default location for this sales point
            </label>
          </div>
        </div>

        <div class="form-dialog-row">
          <span class="form-dialog-label">Sellable</span>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                type="checkbox"
                checked={form.isSellable}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField("isSellable", (event.currentTarget as HTMLInputElement).checked)
                }
              />
              Stock at this location can be sold on invoices
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
            {isSubmitting
              ? "Saving…"
              : mode === "create"
                ? "Add storage location"
                : "Save changes"}
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
