import { Fragment } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import type {
  PermissionActionKey,
  PermissionMatrix,
  PermissionMatrixRow,
  RolePermissionsSnapshot,
} from "../../shared/permissions.types.ts";
import { PERMISSION_UI_GROUPS } from "../../shared/permissionUiGroups.ts";
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

interface FilteredPermissionGroup {
  id: string;
  label: string;
  routes: PermissionMatrixRow[];
  actions: Array<{ key: PermissionActionKey; label: string }>;
}

const COLLAPSE_STORAGE_KEY = "permissions-matrix-collapsed-groups";

function matchesPermissionSearch(
  query: string,
  ...parts: Array<string | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return parts.some((part) => String(part ?? "").toLowerCase().includes(q));
}

function readCollapsedGroups(): Set<string> {
  try {
    const raw = sessionStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeCollapsedGroups(collapsed: Set<string>): void {
  try {
    sessionStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Ignore quota / private-mode failures.
  }
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
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() =>
    readCollapsedGroups(),
  );

  async function reloadMatrix() {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Login required.");
    }
    const result = await getElectronApi().permissions.getMatrix(token);
    if ("error" in result) {
      throw new Error(result.error);
    }
    setMatrix(result);
  }

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        await reloadMatrix();
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

  const filteredGroups = useMemo((): FilteredPermissionGroup[] => {
    if (!matrix) {
      return [];
    }

    const routesById = new Map(matrix.routes.map((route) => [route.routeId, route]));
    const actionsByKey = new Map(matrix.actions.map((action) => [action.key, action]));
    const hasSearch = searchQuery.trim().length > 0;

    const groups: FilteredPermissionGroup[] = [];
    for (const group of PERMISSION_UI_GROUPS) {
      const routes = group.routeIds
        .map((routeId) => routesById.get(routeId))
        .filter((route): route is PermissionMatrixRow => Boolean(route))
        .filter((route) =>
          matchesPermissionSearch(searchQuery, route.label, route.routeId, route.sectionId),
        );

      const actions = group.actionKeys
        .map((key) => actionsByKey.get(key))
        .filter(
          (action): action is { key: PermissionActionKey; label: string } => Boolean(action),
        )
        .filter((action) => matchesPermissionSearch(searchQuery, action.label, action.key));

      const groupMatches = matchesPermissionSearch(searchQuery, group.label, group.id);
      if (hasSearch) {
        if (!groupMatches && routes.length === 0 && actions.length === 0) {
          continue;
        }
        groups.push({
          id: group.id,
          label: group.label,
          routes: groupMatches
            ? group.routeIds
                .map((routeId) => routesById.get(routeId))
                .filter((route): route is PermissionMatrixRow => Boolean(route))
            : routes,
          actions: groupMatches
            ? group.actionKeys
                .map((key) => actionsByKey.get(key))
                .filter(
                  (action): action is { key: PermissionActionKey; label: string } =>
                    Boolean(action),
                )
            : actions,
        });
      } else {
        groups.push({
          id: group.id,
          label: group.label,
          routes: group.routeIds
            .map((routeId) => routesById.get(routeId))
            .filter((route): route is PermissionMatrixRow => Boolean(route)),
          actions: group.actionKeys
            .map((key) => actionsByKey.get(key))
            .filter(
              (action): action is { key: PermissionActionKey; label: string } =>
                Boolean(action),
            ),
        });
      }
    }
    return groups;
  }, [matrix, searchQuery]);

  function setCollapsed(next: Set<string>) {
    setCollapsedGroupIds(next);
    writeCollapsedGroups(next);
  }

  function toggleGroupCollapsed(groupId: string) {
    setCollapsedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      writeCollapsedGroups(next);
      return next;
    });
  }

  function expandAllGroups() {
    setCollapsed(new Set());
  }

  function collapseAllGroups() {
    setCollapsed(new Set(PERMISSION_UI_GROUPS.map((group) => group.id)));
  }

  function isGroupExpanded(groupId: string): boolean {
    if (searchQuery.trim().length > 0) {
      return true;
    }
    return !collapsedGroupIds.has(groupId);
  }

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

      const snapshot = await getElectronApi().permissions.getSnapshot(token);
      if (snapshot) {
        onPermissionsSaved(snapshot);
      }
      setBanner("Permissions saved.");
      await reloadMatrix();
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

  const hasSearch = searchQuery.trim().length > 0;
  const emptyFilter = hasSearch && filteredGroups.length === 0;
  const roleColumnCount = matrix?.roles.length ?? 0;

  return (
    <div class="customers-screen permissions-screen">
      <div class="access-admin-toolbar">
        <header class="customers-screen-header">
          <div>
            <h2 class="customers-screen-brand-title">Role permissions</h2>
            <p class="customers-screen-brand-subtitle">
              Configure module access and special actions for each role.
            </p>
          </div>
          <div class="customers-screen-header-actions">
            <label class="permissions-search-wrap">
              <span class="visually-hidden">Search modules and actions</span>
              <input
                type="search"
                class="customers-search permissions-search"
                value={searchQuery}
                placeholder="Search modules or actions…"
                onInput={(event) =>
                  setSearchQuery((event.currentTarget as HTMLInputElement).value)
                }
              />
            </label>
            <button
              type="button"
              class="customers-btn"
              disabled={!matrix || hasSearch}
              onClick={expandAllGroups}
            >
              Expand all
            </button>
            <button
              type="button"
              class="customers-btn"
              disabled={!matrix || hasSearch}
              onClick={collapseAllGroups}
            >
              Collapse all
            </button>
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
      </div>

      <div class="access-admin-body">
        {isLoading ? <p class="customers-muted">Loading permission matrix…</p> : null}

        {!isLoading && matrix ? (
          <div class="customers-card permissions-matrix-wrap">
            {emptyFilter ? (
              <p class="customers-muted permissions-search-empty">
                No modules or actions match “{searchQuery.trim()}”.
              </p>
            ) : (
              <table class="permissions-matrix">
                <colgroup>
                  <col class="permissions-col-route" />
                  {matrix.roles.map((role) => (
                    <col key={role} class="permissions-col-role" />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th>Module / action</th>
                    {matrix.roles.map((role) => {
                      const label = matrix.roleLabels[role] ?? formatRoleLabel(role);
                      return (
                        <th key={role} title={label}>
                          {label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => {
                    const expanded = isGroupExpanded(group.id);
                    const memberCount = group.routes.length + group.actions.length;
                    return (
                      <Fragment key={group.id}>
                        <tr class="permissions-group-header-row">
                          <td colSpan={1 + roleColumnCount}>
                            <button
                              type="button"
                              class="permissions-group-toggle"
                              aria-expanded={expanded}
                              onClick={() => toggleGroupCollapsed(group.id)}
                            >
                              <span
                                class={`permissions-group-chevron${expanded ? " is-expanded" : ""}`}
                                aria-hidden="true"
                              >
                                ▸
                              </span>
                              <span class="permissions-group-label">{group.label}</span>
                              <span class="permissions-group-count">{memberCount}</span>
                            </button>
                          </td>
                        </tr>
                        {expanded
                          ? group.routes.map((route) => (
                              <tr key={route.routeId}>
                                <td class="permissions-route-label" title={route.label}>
                                  {route.label}
                                </td>
                                {matrix.roles.map((role) => (
                                  <td key={`${route.routeId}-${role}`}>
                                    <select
                                      class="permissions-select"
                                      value={
                                        matrix.routeAccess[role]?.[route.routeId] ?? "none"
                                      }
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
                            ))
                          : null}
                        {expanded
                          ? group.actions.map((action) => (
                              <tr key={action.key} class="permissions-action-row">
                                <td class="permissions-route-label" title={action.label}>
                                  {action.label}
                                </td>
                                {matrix.roles.map((role) => (
                                  <td
                                    key={`${action.key}-${role}`}
                                    class="permissions-action-cell"
                                  >
                                    <label class="permissions-checkbox" title="Allowed">
                                      <input
                                        type="checkbox"
                                        aria-label="Allowed"
                                        checked={Boolean(
                                          matrix.actionAccess[role]?.[action.key],
                                        )}
                                        onChange={(event) =>
                                          updateActionAccess(
                                            role,
                                            action.key,
                                            (event.currentTarget as HTMLInputElement).checked,
                                          )
                                        }
                                      />
                                    </label>
                                  </td>
                                ))}
                              </tr>
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
