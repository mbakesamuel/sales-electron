import { useEffect, useMemo, useState } from "preact/hooks";
import type {
  RoleDefinition,
  RolePermissionsSnapshot,
} from "../../shared/permissions.types.ts";
import { roleIdFromLabel } from "../../shared/roles.ts";
import { getAuthToken } from "../auth/db.ts";
import { getElectronApi } from "../auth/client.ts";
import "../customers/CustomersScreen.css";
import "./RolesScreen.css";

interface RolesScreenProps {
  permissions: RolePermissionsSnapshot;
}

export function RolesScreen({ permissions }: RolesScreenProps) {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roleBusy, setRoleBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newId, setNewId] = useState("");
  const [copyFromRoleId, setCopyFromRoleId] = useState("STORE_KEEPER");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return roles;
    }
    return roles.filter(
      (role) =>
        role.label.toLowerCase().includes(q) ||
        role.id.toLowerCase().includes(q),
    );
  }, [roles, searchQuery]);

  async function reloadRoles() {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Login required.");
    }
    const result = await getElectronApi().permissions.listRoles(token);
    if ("error" in result) {
      throw new Error(result.error);
    }
    setRoles(result);
  }

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        await reloadRoles();
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load roles.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  async function handleCreateRole() {
    const token = getAuthToken();
    if (!token) {
      setError("Login required.");
      return;
    }
    setRoleBusy(true);
    setError(null);
    setBanner(null);
    try {
      const result = await getElectronApi().permissions.createRole({
        authToken: token,
        label: newLabel,
        id: newId.trim() || null,
        copyFromRoleId,
      });
      if (result.ok === false) {
        throw new Error(result.error);
      }
      setShowCreate(false);
      setNewLabel("");
      setNewId("");
      setCopyFromRoleId("STORE_KEEPER");
      await reloadRoles();
      setBanner(`Role "${result.role.label}" created.`);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Failed to create role.",
      );
    } finally {
      setRoleBusy(false);
    }
  }

  async function handleUpdateRole(id: string) {
    const token = getAuthToken();
    if (!token) {
      setError("Login required.");
      return;
    }
    setRoleBusy(true);
    setError(null);
    setBanner(null);
    try {
      const result = await getElectronApi().permissions.updateRole({
        authToken: token,
        id,
        label: editingLabel,
      });
      if (result.ok === false) {
        throw new Error(result.error);
      }
      setEditingId(null);
      setEditingLabel("");
      await reloadRoles();
      setBanner(`Role "${result.role.label}" updated.`);
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Failed to update role.",
      );
    } finally {
      setRoleBusy(false);
    }
  }

  async function handleDeleteRole(role: RoleDefinition) {
    if (role.isSystem) {
      return;
    }
    const confirmed = window.confirm(
      `Delete role "${role.label}" (${role.id})? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setError("Login required.");
      return;
    }
    setRoleBusy(true);
    setError(null);
    setBanner(null);
    try {
      const result = await getElectronApi().permissions.deleteRole({
        authToken: token,
        id: role.id,
      });
      if (result.ok === false) {
        throw new Error(result.error);
      }
      await reloadRoles();
      setBanner(`Role "${role.label}" deleted.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete role.",
      );
    } finally {
      setRoleBusy(false);
    }
  }

  if (!permissions.actions.manage_permissions) {
    return (
      <p class="customers-error">You do not have permission to manage roles.</p>
    );
  }

  return (
    <div class="customers-screen roles-screen">
      <div class="access-admin-toolbar">
        <header class="customers-screen-header">
          <div>
            <h2 class="customers-screen-brand-title">Roles</h2>
            <p class="customers-screen-brand-subtitle">
              Create, rename, and delete application roles. Configure access on Role permissions.
            </p>
          </div>
          <div class="customers-screen-header-actions">
            <label class="roles-search-wrap">
              <span class="visually-hidden">Search roles</span>
              <input
                type="search"
                class="customers-search roles-search"
                value={searchQuery}
                placeholder="Search roles…"
                onInput={(event) =>
                  setSearchQuery((event.currentTarget as HTMLInputElement).value)
                }
              />
            </label>
            <button
              type="button"
              class="customers-btn customers-btn-primary"
              disabled={isLoading || roleBusy}
              onClick={() => {
                setShowCreate(true);
                setNewLabel("");
                setNewId("");
                setCopyFromRoleId(
                  roles.some((role) => role.id === "STORE_KEEPER")
                    ? "STORE_KEEPER"
                    : (roles[0]?.id ?? "STORE_KEEPER"),
                );
              }}
            >
              Add role
            </button>
          </div>
        </header>

        {error ? <p class="customers-error">{error}</p> : null}
        {banner ? <p class="customers-success">{banner}</p> : null}
      </div>

      <div class="access-admin-body">
        {isLoading ? <p class="customers-muted">Loading roles…</p> : null}

        {!isLoading ? (
          <>
            <div class="customers-card roles-card">
            <ul class="roles-list">
              {filteredRoles.length === 0 ? (
                <li class="roles-item roles-item-empty">
                  <p class="customers-muted">
                    {searchQuery.trim()
                      ? `No roles match “${searchQuery.trim()}”.`
                      : "No roles yet."}
                  </p>
                </li>
              ) : null}
              {filteredRoles.map((role) => (
                <li key={role.id} class="roles-item">
                  {editingId === role.id ? (
                    <div class="roles-edit">
                      <input
                        class="roles-input"
                        value={editingLabel}
                        onInput={(event) =>
                          setEditingLabel((event.currentTarget as HTMLInputElement).value)
                        }
                      />
                      <button
                        type="button"
                        class="customers-btn customers-btn-primary customers-btn-small"
                        disabled={roleBusy || !editingLabel.trim()}
                        onClick={() => void handleUpdateRole(role.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        class="customers-btn customers-btn-secondary customers-btn-small"
                        disabled={roleBusy}
                        onClick={() => {
                          setEditingId(null);
                          setEditingLabel("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div class="roles-meta">
                        <strong>{role.label}</strong>
                        <span class="roles-id">{role.id}</span>
                        {role.isSystem ? (
                          <span class="customers-badge customers-badge-slate">System</span>
                        ) : (
                          <span class="customers-badge customers-badge-sky">Custom</span>
                        )}
                        {role.userCount > 0 ? (
                          <span class="roles-users">
                            {role.userCount} user{role.userCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                      <div class="roles-actions">
                        <button
                          type="button"
                          class="customers-btn customers-btn-secondary customers-btn-small"
                          disabled={roleBusy}
                          onClick={() => {
                            setEditingId(role.id);
                            setEditingLabel(role.label);
                          }}
                        >
                          Rename
                        </button>
                        {!role.isSystem ? (
                          <button
                            type="button"
                            class="customers-btn customers-btn-secondary customers-btn-small"
                            disabled={roleBusy}
                            onClick={() => void handleDeleteRole(role)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {showCreate ? (
            <div class="customers-card roles-create-card">
              <h3 class="roles-create-title">New role</h3>
              <div class="roles-create-fields">
                <label class="roles-form-field">
                  <span class="roles-form-label">Display name</span>
                  <input
                    class="roles-input"
                    value={newLabel}
                    onInput={(event) =>
                      setNewLabel((event.currentTarget as HTMLInputElement).value)
                    }
                    placeholder="e.g. Store Keeper"
                  />
                </label>
                <label class="roles-form-field">
                  <span class="roles-form-label">Role id (optional)</span>
                  <input
                    class="roles-input"
                    value={newId}
                    onInput={(event) =>
                      setNewId((event.currentTarget as HTMLInputElement).value.toUpperCase())
                    }
                    placeholder={
                      newLabel ? roleIdFromLabel(newLabel) || "STORE_KEEPER" : "STORE_KEEPER"
                    }
                  />
                </label>
                <label class="roles-form-field">
                  <span class="roles-form-label">Copy permissions from</span>
                  <select
                    class="roles-select"
                    value={copyFromRoleId}
                    onChange={(event) =>
                      setCopyFromRoleId((event.currentTarget as HTMLSelectElement).value)
                    }
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div class="roles-create-actions">
                <button
                  type="button"
                  class="customers-btn customers-btn-primary"
                  disabled={roleBusy || !newLabel.trim()}
                  onClick={() => void handleCreateRole()}
                >
                  {roleBusy ? "Creating…" : "Create role"}
                </button>
                <button
                  type="button"
                  class="customers-btn customers-btn-secondary"
                  disabled={roleBusy}
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
      </div>
    </div>
  );
}
