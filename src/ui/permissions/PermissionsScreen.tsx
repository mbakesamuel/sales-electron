import { useEffect, useState } from "preact/hooks";
import type {
  PermissionMatrix,
  RolePermissionsSnapshot,
} from "../../shared/permissions.types.ts";
import type { RouteAccess } from "../../shared/roles.ts";
import { formatRoleLabel } from "../../shared/roles.ts";
import { getAuthToken } from "../auth/db.ts";
import { getElectronApi } from "../auth/client.ts";
import "../customers/CustomersScreen.css";
import "./PermissionsScreen.css";

interface PermissionsScreenProps {
  permissions: RolePermissionsSnapshot;
  onPermissionsSaved: (next: RolePermissionsSnapshot) => void;
}

export function PermissionsScreen({
  permissions,
  onPermissionsSaved,
}: PermissionsScreenProps) {
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const token = getAuthToken();
        if (!token) {
          throw new Error("Login required.");
        }

        const result = await getElectronApi().permissions.getMatrix(token);
        if ("error" in result) {
          throw new Error(result.error);
        }

        setMatrix(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load permissions.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  function updateRouteAccess(role: string, routeId: string, access: RouteAccess) {
    setMatrix((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        routeAccess: {
          ...current.routeAccess,
          [role]: {
            ...current.routeAccess[role],
            [routeId]: access,
          },
        },
      };
    });
  }

  function updateActionAccess(role: string, actionKey: string, allowed: boolean) {
    setMatrix((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        actionAccess: {
          ...current.actionAccess,
          [role]: {
            ...current.actionAccess[role],
            [actionKey]: allowed,
          },
        },
      };
    });
  }

  async function handleSave() {
    if (!matrix) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError("Login required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setBanner(null);

    try {
      const result = await getElectronApi().permissions.saveMatrix({
        authToken: token,
        routeAccess: matrix.routeAccess,
        actionAccess: matrix.actionAccess,
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      const refreshed = await getElectronApi().permissions.getSnapshot(token);
      if (refreshed) {
        onPermissionsSaved(refreshed);
      }

      setBanner("Permissions saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save permissions.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!permissions.actions.manage_permissions) {
    return (
      <p class="customers-error">You do not have permission to manage role permissions.</p>
    );
  }

  return (
    <div class="customers-screen">
      <header class="customers-screen-header">
        <div>
          <h2 class="customers-screen-brand-title">Role permissions</h2>
          <p class="customers-screen-brand-subtitle">
            Configure module access and special actions for each role.
          </p>
        </div>
        <div class="customers-screen-header-actions">
          <button
            type="button"
            class="customers-btn customers-btn-primary"
            disabled={!matrix || isSaving}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Save permissions"}
          </button>
        </div>
      </header>

      {error ? <p class="customers-error">{error}</p> : null}
      {banner ? <p class="customers-success">{banner}</p> : null}

      {isLoading ? <p class="customers-muted">Loading permission matrix…</p> : null}

      {!isLoading && matrix ? (
        <div class="customers-card permissions-matrix-wrap">
          <table class="permissions-matrix">
            <thead>
              <tr>
                <th>Module / action</th>
                {matrix.roles.map((role) => (
                  <th key={role}>{formatRoleLabel(role)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.routes.map((route) => (
                <tr key={route.routeId}>
                  <td>{route.label}</td>
                  {matrix.roles.map((role) => (
                    <td key={`${route.routeId}-${role}`}>
                      <select
                        class="permissions-select"
                        value={matrix.routeAccess[role]?.[route.routeId] ?? "none"}
                        onChange={(event) =>
                          updateRouteAccess(
                            role,
                            route.routeId,
                            (event.currentTarget as HTMLSelectElement)
                              .value as RouteAccess,
                          )
                        }
                      >
                        <option value="none">None</option>
                        <option value="read">Read</option>
                        <option value="write">Write</option>
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
              {matrix.actions.map((action) => (
                <tr key={action.key} class="permissions-action-row">
                  <td>{action.label}</td>
                  {matrix.roles.map((role) => (
                    <td key={`${action.key}-${role}`}>
                      <label class="permissions-checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(matrix.actionAccess[role]?.[action.key])}
                          onChange={(event) =>
                            updateActionAccess(
                              role,
                              action.key,
                              (event.currentTarget as HTMLInputElement).checked,
                            )
                          }
                        />
                        Allowed
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
