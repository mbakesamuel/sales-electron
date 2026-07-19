import { useEffect, useMemo, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { canWriteRouteFromSnapshot } from "../../shared/permissionUtils.ts";
import type {
  CarryForwardStockFormOptions,
  CarryForwardStockRow,
} from "../../shared/carryForwardStock.types.ts";
import type { AuthUser } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";
import "../commitments/CarryForwardCommitmentsScreen.css";

interface CarryForwardStockScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  readOnly?: boolean;
}

function formatQty(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function CarryForwardStockScreen({
  user,
  permissions,
  readOnly = false,
}: CarryForwardStockScreenProps) {
  const canWrite =
    canWriteRouteFromSnapshot(permissions, "carry-forward-stock") && !readOnly;

  const [rows, setRows] = useState<CarryForwardStockRow[]>([]);
  const [options, setOptions] = useState<CarryForwardStockFormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [batchOpen, setBatchOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [batchSalesPointId, setBatchSalesPointId] = useState("");
  const [batchProductId, setBatchProductId] = useState("");
  const [batchNotes, setBatchNotes] = useState("Carry-forward stock");
  const [locationFilter, setLocationFilter] = useState("");
  const [qtyByLocation, setQtyByLocation] = useState<Record<string, string>>({});
  const [onHandByLocation, setOnHandByLocation] = useState<Map<number, number>>(
    () => new Map(),
  );

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const api = getElectronApi();
      const [list, formOptions] = await Promise.all([
        api.carryForwardStock.list(),
        api.carryForwardStock.getFormOptions(),
      ]);
      setRows(list);
      setOptions(formOptions);
    } catch (loadError) {
      setRows([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load carry-forward stock.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.productName.toLowerCase().includes(query) ||
        row.salesPointName.toLowerCase().includes(query) ||
        row.storageLocationName.toLowerCase().includes(query) ||
        (row.lastAdjustmentNo ?? "").toLowerCase().includes(query),
    );
  }, [rows, search]);

  const locationsForSalesPoint = useMemo(() => {
    if (!options || !batchSalesPointId) {
      return [];
    }
    const spId = Number.parseInt(batchSalesPointId, 10);
    const query = locationFilter.trim().toLowerCase();
    return options.storageLocations.filter(
      (loc) =>
        loc.salesPointId === spId &&
        (!query || loc.name.toLowerCase().includes(query)),
    );
  }, [options, batchSalesPointId, locationFilter]);

  const batchProduct = useMemo(() => {
    if (!options || !batchProductId) {
      return null;
    }
    const productId = Number.parseInt(batchProductId, 10);
    return options.products.find((p) => p.productId === productId) ?? null;
  }, [options, batchProductId]);

  async function loadScopeOnHand(salesPointId: string, productId: string) {
    const spId = Number.parseInt(salesPointId, 10);
    const prodId = Number.parseInt(productId, 10);
    if (!Number.isFinite(spId) || !Number.isFinite(prodId)) {
      setOnHandByLocation(new Map());
      setQtyByLocation({});
      return;
    }
    try {
      const onHand = await getElectronApi().carryForwardStock.listOnHand({
        salesPointId: spId,
        productId: prodId,
      });
      const map = new Map<number, number>();
      const nextQty: Record<string, string> = {};
      for (const row of onHand) {
        map.set(row.storageLocationId, row.qty);
        nextQty[String(row.storageLocationId)] = String(Math.round(row.qty));
      }
      setOnHandByLocation(map);
      setQtyByLocation(nextQty);
    } catch {
      setOnHandByLocation(new Map());
      setQtyByLocation({});
    }
  }

  function openBatchEntry(prefill?: { salesPointId: number; productId: number }) {
    setActionError(null);
    setLocationFilter("");
    setBatchNotes("Carry-forward stock");
    const salesPointId = prefill ? String(prefill.salesPointId) : "";
    const productId = prefill ? String(prefill.productId) : "";
    setBatchSalesPointId(salesPointId);
    setBatchProductId(productId);
    setBatchOpen(true);
    void loadScopeOnHand(salesPointId, productId);
  }

  function onBatchScopeChange(nextSalesPointId: string, nextProductId: string) {
    setBatchSalesPointId(nextSalesPointId);
    setBatchProductId(nextProductId);
    void loadScopeOnHand(nextSalesPointId, nextProductId);
  }

  async function saveBatch() {
    if (!canWrite || !batchOpen) {
      return;
    }

    const salesPointId = Number.parseInt(batchSalesPointId, 10);
    const productId = Number.parseInt(batchProductId, 10);
    if (!Number.isFinite(salesPointId) || !Number.isFinite(productId)) {
      setActionError("Select sales point and product.");
      return;
    }

    const lines: Array<{ storageLocationId: number; onHandQty: number }> = [];
    for (const [locationIdKey, raw] of Object.entries(qtyByLocation)) {
      const trimmed = raw.trim();
      if (trimmed === "") {
        continue;
      }
      const onHandQty = Number.parseFloat(trimmed.replace(",", "."));
      if (!Number.isFinite(onHandQty) || onHandQty < 0) {
        setActionError("On-hand quantities must be numbers ≥ 0.");
        return;
      }
      lines.push({
        storageLocationId: Number.parseInt(locationIdKey, 10),
        onHandQty,
      });
    }

    if (lines.length === 0) {
      setActionError("Enter at least one on-hand quantity.");
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      const result = await getElectronApi().carryForwardStock.upsertBatch({
        userId: user.id,
        salesPointId,
        productId,
        notes: batchNotes.trim() || null,
        lines,
      });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setBatchOpen(false);
      await reload();
    } catch (saveError) {
      setActionError(
        saveError instanceof Error ? saveError.message : "Failed to save batch.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="cf-screen">
      <header class="cf-header">
        <div>
          <h2 class="cf-title">Carry-forward stock</h2>
          <p class="cf-subtitle">
            Batch-set opening on-hand by sales point and product across storage
            locations. Posts as carry-forward stock adjustments so balances and
            reports update immediately.
          </p>
        </div>
        <div class="cf-header-actions">
          <button
            type="button"
            class="cf-btn cf-btn-secondary"
            onClick={() => void reload()}
            disabled={loading}
          >
            Refresh
          </button>
          {canWrite ? (
            <button
              type="button"
              class="cf-btn cf-btn-primary"
              onClick={() => openBatchEntry()}
            >
              Batch entry
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p class="cf-error">{error}</p> : null}
      {actionError && !batchOpen ? <p class="cf-error">{actionError}</p> : null}

      <div class="cf-toolbar">
        <input
          class="cf-search"
          type="search"
          value={search}
          placeholder="Search product, sales point, location, adjustment…"
          onInput={(event) =>
            setSearch((event.currentTarget as HTMLInputElement).value)
          }
        />
        <span class="cf-count">
          {loading ? "Loading…" : `${filtered.length} line${filtered.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div class="cf-table-wrap">
        <table class="cf-table">
          <thead>
            <tr>
              <th>Sales point</th>
              <th>Product</th>
              <th>Location</th>
              <th class="cf-num">On hand</th>
              <th>Last CF adj.</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} class="cf-empty">
                  No carry-forward stock yet. Use Batch entry to set opening on-hand.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={`${row.salesPointId}-${row.productId}-${row.storageLocationId}`}
                >
                  <td>{row.salesPointName}</td>
                  <td>
                    {row.productName}
                    <span class="cf-hint-inline"> ({row.uom})</span>
                  </td>
                  <td>{row.storageLocationName}</td>
                  <td class="cf-num">{formatQty(row.currentQty)}</td>
                  <td>{row.lastAdjustmentNo ?? "—"}</td>
                  <td>{row.lastOccurredAt ?? "—"}</td>
                  <td class="cf-actions">
                    {canWrite ? (
                      <button
                        type="button"
                        class="cf-link"
                        onClick={() =>
                          openBatchEntry({
                            salesPointId: row.salesPointId,
                            productId: row.productId,
                          })
                        }
                      >
                        Edit
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {batchOpen ? (
        <FormDialog
          ariaLabel="Carry-forward stock batch entry"
          title="Batch entry — carry-forward stock"
          subtitle="Pick sales point and product, then enter desired on-hand (SELLABLE) per storage location. Blank rows are skipped; unchanged quantities are not posted."
          wide
          onClose={() => {
            if (!saving) setBatchOpen(false);
          }}
        >
          <div class="cf-batch">
            <div class="cf-batch-scope">
              <label class="cf-field">
                <span>Sales point</span>
                <select
                  value={batchSalesPointId}
                  disabled={saving}
                  onChange={(event) => {
                    const next = (event.currentTarget as HTMLSelectElement).value;
                    onBatchScopeChange(next, batchProductId);
                  }}
                >
                  <option value="">Select sales point…</option>
                  {(options?.salesPoints ?? []).map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </label>
              <label class="cf-field">
                <span>Product</span>
                <select
                  value={batchProductId}
                  disabled={saving}
                  onChange={(event) => {
                    const next = (event.currentTarget as HTMLSelectElement).value;
                    onBatchScopeChange(batchSalesPointId, next);
                  }}
                >
                  <option value="">Select product…</option>
                  {(options?.products ?? []).map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </label>
              <label class="cf-field cf-field-notes">
                <span>Notes / reason</span>
                <input
                  type="text"
                  value={batchNotes}
                  disabled={saving}
                  onInput={(event) =>
                    setBatchNotes((event.currentTarget as HTMLInputElement).value)
                  }
                />
              </label>
            </div>

            <div class="cf-batch-toolbar">
              <input
                class="cf-search"
                type="search"
                value={locationFilter}
                placeholder="Filter locations…"
                disabled={saving || !batchSalesPointId || !batchProductId}
                onInput={(event) =>
                  setLocationFilter((event.currentTarget as HTMLInputElement).value)
                }
              />
              <span class="cf-count">
                {locationsForSalesPoint.length} location
                {locationsForSalesPoint.length === 1 ? "" : "s"}
                {batchProduct ? ` · ${batchProduct.uom}` : ""}
              </span>
            </div>

            {!batchSalesPointId || !batchProductId ? (
              <p class="cf-hint">Select sales point and product to load the location grid.</p>
            ) : locationsForSalesPoint.length === 0 ? (
              <p class="cf-hint">No storage locations for this sales point.</p>
            ) : (
              <div class="cf-batch-grid-wrap">
                <table class="cf-table cf-batch-grid">
                  <thead>
                    <tr>
                      <th>Storage location</th>
                      <th class="cf-num">Current</th>
                      <th class="cf-num">Desired on hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationsForSalesPoint.map((loc) => {
                      const key = String(loc.id);
                      const current = onHandByLocation.get(loc.id);
                      return (
                        <tr key={loc.id}>
                          <td>
                            {loc.name}
                            {loc.isDefault ? (
                              <span class="cf-hint-inline"> · default</span>
                            ) : null}
                          </td>
                          <td class="cf-num">
                            {current != null ? formatQty(current) : "—"}
                          </td>
                          <td class="cf-num">
                            <input
                              id={`cfs-qty-${loc.id}`}
                              class="cf-qty-input"
                              type="number"
                              min={0}
                              step="any"
                              disabled={saving}
                              value={qtyByLocation[key] ?? ""}
                              placeholder="—"
                              onInput={(event) => {
                                const value = (
                                  event.currentTarget as HTMLInputElement
                                ).value;
                                setQtyByLocation((prev) => ({
                                  ...prev,
                                  [key]: value,
                                }));
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {actionError ? <p class="cf-error">{actionError}</p> : null}

            <div class="form-dialog-actions" style="padding-left: 0; margin-top: 12px;">
              <button
                type="button"
                class="form-dialog-btn-primary"
                disabled={saving || !batchSalesPointId || !batchProductId}
                onClick={() => void saveBatch()}
              >
                {saving ? "Posting…" : "Post carry-forward"}
              </button>
              <button
                type="button"
                class="form-dialog-btn-secondary"
                disabled={saving}
                onClick={() => setBatchOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
