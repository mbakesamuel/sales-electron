import { useEffect, useMemo, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

type OwnerKind = "mill" | "salesPoint";

interface MillOption {
  id: number;
  name: string;
}

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
  ownerKind: OwnerKind;
  millId: string;
  salesPointId: string;
  isDefault: boolean;
  isActive: boolean;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return {
      locationId: "",
      ownerKind: "mill",
      millId: "",
      salesPointId: "",
      isDefault: false,
      isActive: true,
    };
  }

  const hasMill = row.millId != null && row.millId !== "";
  return {
    locationId:
      row.locationId != null && row.locationId !== "" ? String(row.locationId) : "",
    ownerKind: hasMill ? "mill" : "salesPoint",
    millId: hasMill ? String(row.millId) : "",
    salesPointId:
      row.salesPointId != null && row.salesPointId !== ""
        ? String(row.salesPointId)
        : "",
    isDefault: row.isDefault === 1 || row.isDefault === true,
    isActive: row.isActive === 1 || row.isActive === true || row.isActive == null,
  };
}

export function StorageLocationFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: StorageLocationFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [mills, setMills] = useState<MillOption[]>([]);
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
    const selectedMillId =
      row?.millId != null && row.millId !== "" ? Number(row.millId) : null;
    const selectedSalesPointId =
      row?.salesPointId != null && row.salesPointId !== ""
        ? Number(row.salesPointId)
        : null;
    const selectedLocationId =
      row?.locationId != null && row.locationId !== ""
        ? Number(row.locationId)
        : null;

    void (async () => {
      try {
        const api = getElectronApi();
        const [millResult, salesPointResult, locationResult] = await Promise.all([
          api.db.queryTable({ table: "Mill", limit: 200 }),
          api.db.queryTable({ table: "SalesPoint", limit: 200 }),
          api.db.queryTable({ table: "Location", limit: 500 }),
        ]);

        if (cancelled) {
          return;
        }

        setMills(
          millResult.rows
            .filter((millRow) => {
              const isActive =
                millRow.isActive === 1 ||
                millRow.isActive === true ||
                millRow.isActive == null;
              const id = Number(millRow.id);
              return isActive || (selectedMillId != null && id === selectedMillId);
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

        setSalesPoints(
          salesPointResult.rows
            .filter((spRow) => {
              const isActive =
                spRow.isActive === 1 ||
                spRow.isActive === true ||
                spRow.isActive == null;
              const id = Number(spRow.id);
              return (
                isActive ||
                (selectedSalesPointId != null && id === selectedSalesPointId)
              );
            })
            .map((spRow) => {
              const isActive =
                spRow.isActive === 1 ||
                spRow.isActive === true ||
                spRow.isActive == null;
              const name = String(spRow.name ?? `Sales point ${spRow.id}`);
              return {
                id: Number(spRow.id),
                name: isActive ? name : `${name} (inactive)`,
              };
            }),
        );

        setLocations(
          locationResult.rows
            .filter((locationRow) => {
              const isActive =
                locationRow.isActive === 1 ||
                locationRow.isActive === true ||
                locationRow.isActive == null;
              const id = Number(locationRow.id);
              return (
                isActive ||
                (selectedLocationId != null && id === selectedLocationId)
              );
            })
            .map((locationRow) => {
              const isActive =
                locationRow.isActive === 1 ||
                locationRow.isActive === true ||
                locationRow.isActive == null;
              const locationName = String(
                locationRow.locationName ?? `Location ${locationRow.id}`,
              );
              return {
                id: Number(locationRow.id),
                locationName: isActive
                  ? locationName
                  : `${locationName} (inactive)`,
              };
            }),
        );
      } catch {
        if (!cancelled) {
          setMills([]);
          setSalesPoints([]);
          setLocations([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [row?.millId, row?.salesPointId, row?.locationId]);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setOwnerKind(kind: OwnerKind) {
    setForm((current) => ({
      ...current,
      ownerKind: kind,
      millId: kind === "mill" ? current.millId : "",
      salesPointId: kind === "salesPoint" ? current.salesPointId : "",
    }));
  }

  async function clearOtherDefaults(options: {
    millId?: number;
    salesPointId?: number;
    exceptId?: number;
  }) {
    const api = getElectronApi();
    const result = await api.db.queryTable({ table: "StorageLocation", limit: 500 });
    const updates = result.rows.filter((item) => {
      if (options.exceptId != null && Number(item.id) === options.exceptId) {
        return false;
      }
      if (!(item.isDefault === 1 || item.isDefault === true)) {
        return false;
      }
      if (options.millId != null) {
        return Number(item.millId) === options.millId;
      }
      if (options.salesPointId != null) {
        return Number(item.salesPointId) === options.salesPointId;
      }
      return false;
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
    if (!Number.isFinite(locationId)) {
      setError("Select a location.");
      return;
    }

    let millId: number | null = null;
    let salesPointId: number | null = null;

    if (form.ownerKind === "mill") {
      millId = Number.parseInt(form.millId, 10);
      if (!Number.isFinite(millId)) {
        setError("Select a mill.");
        return;
      }
    } else {
      salesPointId = Number.parseInt(form.salesPointId, 10);
      if (!Number.isFinite(salesPointId)) {
        setError("Select a sales point.");
        return;
      }
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      locationId,
      millId,
      salesPointId,
      isDefault: form.isDefault ? 1 : 0,
      isActive: form.isActive ? 1 : 0,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    try {
      if (form.isDefault) {
        await clearOtherDefaults({
          millId: millId ?? undefined,
          salesPointId: salesPointId ?? undefined,
          exceptId: mode === "edit" && row?.id != null ? Number(row.id) : undefined,
        });
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
  const defaultOwnerLabel =
    form.ownerKind === "mill" ? "mill" : "sales point";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Assign a location to a mill or sales point"
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
              Manage location names under Locations in the sidebar. Sales tanks should be
              assigned to a sales point; other locations to a mill.
            </p>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sl-owner-kind">
            Owner
          </label>
          <div class="form-dialog-control">
            <select
              id="sl-owner-kind"
              class="form-dialog-input"
              value={form.ownerKind}
              disabled={isSubmitting}
              onChange={(event) =>
                setOwnerKind(
                  (event.currentTarget as HTMLSelectElement).value as OwnerKind,
                )
              }
            >
              <option value="mill">Mill</option>
              <option value="salesPoint">Sales point</option>
            </select>
          </div>
        </div>

        {form.ownerKind === "mill" ? (
          <div class="form-dialog-row">
            <label class="form-dialog-label" for="sl-mill">
              Mill
            </label>
            <div class="form-dialog-control">
              <select
                id="sl-mill"
                class="form-dialog-input"
                value={form.millId}
                disabled={isSubmitting}
                onChange={(event) =>
                  updateField("millId", (event.currentTarget as HTMLSelectElement).value)
                }
              >
                <option value="">Select a mill</option>
                {mills.map((mill) => (
                  <option key={mill.id} value={String(mill.id)}>
                    {mill.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
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
        )}

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
              Use as the default location for this {defaultOwnerLabel}
            </label>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="sl-active">
            Status
          </label>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                id="sl-active"
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
              Inactive storage locations stay in history but are hidden in selection lists.
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
