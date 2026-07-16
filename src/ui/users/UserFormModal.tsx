import { useEffect, useMemo, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import {
  formatRoleLabel,
  USER_ROLES,
  type UserRole,
} from "../../shared/roles.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { buildRowKey } from "../utils/formRowKey.ts";
import "../components/FormDialog.css";

interface LookupOption {
  id: string;
  label: string;
}

interface UserFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormData {
  name: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  password: string;
  commercialServiceId: string;
  salesPointId: string;
}

function initForm(mode: "create" | "edit", row?: Record<string, unknown>): FormData {
  if (mode !== "edit" || !row) {
    return {
      name: "",
      username: "",
      role: "SALES_CLERK",
      isActive: true,
      password: "",
      commercialServiceId: "",
      salesPointId: "",
    };
  }

  const role = String(row.role ?? "SALES_CLERK");
  const normalizedRole = USER_ROLES.includes(role as UserRole)
    ? (role as UserRole)
    : "SALES_CLERK";

  return {
    name: row.name != null ? String(row.name) : "",
    username: row.username != null ? String(row.username) : "",
    role: normalizedRole,
    isActive: row.isActive === 1 || row.isActive === true,
    password: "",
    commercialServiceId:
      row.commercialServiceId != null ? String(row.commercialServiceId) : "",
    salesPointId: row.salesPointId != null ? String(row.salesPointId) : "",
  };
}

export function UserFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: UserFormModalProps) {
  const [form, setForm] = useState<FormData>(() => initForm(mode, row));
  const [services, setServices] = useState<LookupOption[]>([]);
  const [salesPoints, setSalesPoints] = useState<LookupOption[]>([]);
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
        const [serviceResult, salesPointResult] = await Promise.all([
          api.db.queryTable({ table: "CommercialService", limit: 200 }),
          api.db.queryTable({ table: "SalesPoint", limit: 200 }),
        ]);

        if (cancelled) {
          return;
        }

        setServices(
          serviceResult.rows.map((serviceRow) => {
            const id = String(serviceRow.id ?? "");
            const name = String(serviceRow.name ?? id);
            const code = serviceRow.code != null ? String(serviceRow.code) : "";
            return {
              id,
              label: code ? `${name} (${code})` : name,
            };
          }),
        );

        setSalesPoints(
          salesPointResult.rows.map((pointRow) => ({
            id: String(pointRow.id ?? ""),
            label: String(pointRow.name ?? `Sales point ${pointRow.id}`),
          })),
        );
      } catch {
        if (!cancelled) {
          setServices([]);
          setSalesPoints([]);
        }
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

    const name = form.name.trim();
    const username = form.username.trim();
    const password = form.password.trim();

    if (!name) {
      setError("Name is required.");
      return;
    }
    if (!username) {
      setError("Username is required.");
      return;
    }
    if (mode === "create" && !password) {
      setError("Password is required.");
      return;
    }
    if (!form.commercialServiceId) {
      setError("Commercial service is required.");
      return;
    }

    setIsSubmitting(true);
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const payload: Record<string, unknown> = {
      name,
      username,
      role: form.role,
      isActive: form.isActive ? 1 : 0,
      commercialServiceId: form.commercialServiceId,
      salesPointId: form.salesPointId
        ? Number.parseInt(form.salesPointId, 10)
        : null,
      updatedAt: now,
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "User",
          values: { ...payload, createdAt: now },
        });
      } else {
        if (!row?.id) {
          throw new Error("User id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "User",
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
          : "Failed to save user.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = mode === "create" ? "Add User" : "Edit User";

  return (
    <FormDialog
      ariaLabel={title}
      title={title}
      subtitle="Account access, role, and commercial service assignment"
      onClose={onClose}
    >
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        <div class="form-dialog-row">
          <label class="form-dialog-label" for="user-name">
            Name
          </label>
          <div class="form-dialog-control">
            <input
              id="user-name"
              class="form-dialog-input"
              value={form.name}
              disabled={isSubmitting}
              placeholder="Full name"
              onInput={(event) =>
                updateField("name", (event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="user-username">
            Username
          </label>
          <div class="form-dialog-control">
            <input
              id="user-username"
              class="form-dialog-input"
              value={form.username}
              disabled={isSubmitting}
              autocomplete="username"
              placeholder="login name"
              onInput={(event) =>
                updateField(
                  "username",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="user-password">
            Password
          </label>
          <div class="form-dialog-control">
            <input
              id="user-password"
              class="form-dialog-input"
              type="password"
              value={form.password}
              disabled={isSubmitting}
              autocomplete="new-password"
              placeholder={
                mode === "create" ? "Required" : "Leave blank to keep current"
              }
              onInput={(event) =>
                updateField(
                  "password",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="user-role">
            Role
          </label>
          <div class="form-dialog-control">
            <select
              id="user-role"
              class="form-dialog-input"
              value={form.role}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "role",
                  (event.currentTarget as HTMLSelectElement).value as UserRole,
                )
              }
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {formatRoleLabel(role)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="user-service">
            Commercial service
          </label>
          <div class="form-dialog-control">
            <select
              id="user-service"
              class="form-dialog-input"
              value={form.commercialServiceId}
              disabled={isSubmitting}
              onChange={(event) =>
                updateField(
                  "commercialServiceId",
                  (event.currentTarget as HTMLSelectElement).value,
                )
              }
            >
              <option value="">Select service…</option>
              {services.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="user-sales-point">
            Sales point
          </label>
          <div class="form-dialog-control">
            <select
              id="user-sales-point"
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
              <option value="">None</option>
              {salesPoints.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div class="form-dialog-row">
          <label class="form-dialog-label" for="user-active">
            Active
          </label>
          <div class="form-dialog-control">
            <label class="form-dialog-checkbox-label">
              <input
                id="user-active"
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
              Can sign in
            </label>
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
