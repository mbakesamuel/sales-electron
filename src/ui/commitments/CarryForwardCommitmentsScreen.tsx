import { useEffect, useMemo, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { canWriteRouteFromSnapshot } from "../../shared/permissionUtils.ts";
import type {
  CarryForwardCommitmentPendingRow,
  CarryForwardCommitmentRow,
  CarryForwardFormOptions,
} from "../../shared/carryForward.types.ts";
import type { AuthUser } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import "../components/FormDialog.css";
import "./CarryForwardCommitmentsScreen.css";

interface CarryForwardCommitmentsScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  readOnly?: boolean;
}

interface BatchDialogState {
  salesPointId: string;
  productId: string;
  focusCustomerId: number | null;
}

type BatchExistingEntry = {
  soldQty: number;
  outstandingQty: number;
  deliveryOrderNo: string;
};

function formatKg(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function CarryForwardCommitmentsScreen({
  user,
  permissions,
  readOnly = false,
}: CarryForwardCommitmentsScreenProps) {
  const canWrite =
    canWriteRouteFromSnapshot(permissions, "carry-forward-commitments") && !readOnly;

  const [rows, setRows] = useState<CarryForwardCommitmentRow[]>([]);
  const [pendingRows, setPendingRows] = useState<CarryForwardCommitmentPendingRow[]>(
    [],
  );
  const [options, setOptions] = useState<CarryForwardFormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [batchDialog, setBatchDialog] = useState<BatchDialogState | null>(null);
  const [saving, setSaving] = useState(false);

  const [batchSalesPointId, setBatchSalesPointId] = useState("");
  const [batchProductId, setBatchProductId] = useState("");
  const [batchNotes, setBatchNotes] = useState("Carry-forward commitment");
  const [customerFilter, setCustomerFilter] = useState("");
  /** customerId -> outstanding qty string (blank = skip on save) */
  const [qtyByCustomer, setQtyByCustomer] = useState<Record<string, string>>({});

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const api = getElectronApi();
      const [list, pending, formOptions] = await Promise.all([
        api.carryForward.list(),
        api.carryForward.listPending({ userId: user.id }),
        api.carryForward.getFormOptions(),
      ]);
      setRows(list);
      setPendingRows(pending);
      setOptions(formOptions);
    } catch (loadError) {
      setRows([]);
      setPendingRows([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load carry-forward commitments.",
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
        row.customerName.toLowerCase().includes(query) ||
        row.salesPointName.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query) ||
        row.deliveryOrderNo.toLowerCase().includes(query),
    );
  }, [rows, search]);

  const filteredPending = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return pendingRows;
    }
    return pendingRows.filter(
      (row) =>
        row.customerName.toLowerCase().includes(query) ||
        row.salesPointName.toLowerCase().includes(query) ||
        row.productName.toLowerCase().includes(query) ||
        row.deliveryOrderNo.toLowerCase().includes(query),
    );
  }, [pendingRows, search]);

  const pendingDoCount = useMemo(
    () => new Set(filteredPending.map((row) => row.deliveryOrderId)).size,
    [filteredPending],
  );

  const existingForBatch = useMemo(() => {
    const spId = Number.parseInt(batchSalesPointId, 10);
    const pId = Number.parseInt(batchProductId, 10);
    if (!Number.isFinite(spId) || !Number.isFinite(pId)) {
      return new Map<number, BatchExistingEntry>();
    }
    const map = new Map<number, BatchExistingEntry>();
    for (const row of rows) {
      if (row.salesPointId === spId && row.productId === pId) {
        map.set(row.customerId, {
          soldQty: row.soldQty,
          outstandingQty: row.outstandingQty,
          deliveryOrderNo: row.deliveryOrderNo,
        });
      }
    }
    for (const row of pendingRows) {
      if (row.salesPointId === spId && row.productId === pId) {
        map.set(row.customerId, {
          soldQty: 0,
          outstandingQty: row.outstandingQty,
          deliveryOrderNo: row.deliveryOrderNo,
        });
      }
    }
    return map;
  }, [rows, pendingRows, batchSalesPointId, batchProductId]);

  const batchCustomers = useMemo(() => {
    if (!options) {
      return [];
    }
    const query = customerFilter.trim().toLowerCase();
    return options.customers.filter(
      (customer) => !query || customer.name.toLowerCase().includes(query),
    );
  }, [options, customerFilter]);

  function hydrateQtyFromExisting(salesPointId: string, productId: string) {
    const spId = Number.parseInt(salesPointId, 10);
    const pId = Number.parseInt(productId, 10);
    const next: Record<string, string> = {};
    if (Number.isFinite(spId) && Number.isFinite(pId)) {
      for (const row of rows) {
        if (row.salesPointId === spId && row.productId === pId) {
          next[String(row.customerId)] = String(Math.round(row.outstandingQty));
        }
      }
      for (const row of pendingRows) {
        if (row.salesPointId === spId && row.productId === pId) {
          next[String(row.customerId)] = String(Math.round(row.outstandingQty));
        }
      }
    }
    setQtyByCustomer(next);
  }

  function openBatchEntry(prefill?: {
    salesPointId: number;
    productId: number;
    focusCustomerId?: number;
  }) {
    setActionError(null);
    setActionSuccess(null);
    setCustomerFilter("");
    setBatchNotes("Carry-forward commitment");
    const salesPointId = prefill ? String(prefill.salesPointId) : "";
    const productId = prefill ? String(prefill.productId) : "";
    setBatchSalesPointId(salesPointId);
    setBatchProductId(productId);
    if (salesPointId && productId) {
      hydrateQtyFromExisting(salesPointId, productId);
    } else {
      setQtyByCustomer({});
    }
    setBatchDialog({
      salesPointId,
      productId,
      focusCustomerId: prefill?.focusCustomerId ?? null,
    });
  }

  function onBatchScopeChange(nextSalesPointId: string, nextProductId: string) {
    setBatchSalesPointId(nextSalesPointId);
    setBatchProductId(nextProductId);
    hydrateQtyFromExisting(nextSalesPointId, nextProductId);
  }

  async function saveBatch() {
    if (!canWrite || !batchDialog) {
      return;
    }

    const salesPointId = Number.parseInt(batchSalesPointId, 10);
    const productId = Number.parseInt(batchProductId, 10);
    if (!Number.isFinite(salesPointId) || !Number.isFinite(productId)) {
      setActionError("Select collection point and product.");
      return;
    }

    const lines: Array<{ customerId: number; outstandingQty: number }> = [];
    for (const [customerIdKey, raw] of Object.entries(qtyByCustomer)) {
      const trimmed = raw.trim();
      if (trimmed === "") {
        continue;
      }
      const outstandingQty = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(outstandingQty) || outstandingQty < 0) {
        setActionError("Outstanding quantities must be whole numbers ≥ 0.");
        return;
      }
      lines.push({
        customerId: Number.parseInt(customerIdKey, 10),
        outstandingQty,
      });
    }

    if (lines.length === 0) {
      setActionError("Enter at least one outstanding quantity.");
      return;
    }

    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await getElectronApi().carryForward.upsertBatch({
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
      setBatchDialog(null);
      if (result.pendingValidation) {
        setActionSuccess(
          result.saved > 0
            ? `Submitted ${result.saved} line${result.saved === 1 ? "" : "s"} for delivery-order validation. Commitments appear on reports and Pick DO after a supervisor validates them.`
            : "No quantity changes to submit.",
        );
      } else if (result.saved > 0) {
        setActionSuccess(
          `Saved ${result.saved} line${result.saved === 1 ? "" : "s"}. Commitments are live on reports and Pick DO.`,
        );
      } else {
        setActionSuccess("No quantity changes to save.");
      }
      await reload();
    } catch (saveError) {
      setActionError(
        saveError instanceof Error ? saveError.message : "Failed to save batch.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row: CarryForwardCommitmentRow) {
    if (!canWrite) {
      return;
    }
    const confirmed = window.confirm(
      `Delete CF line for ${row.customerName} / ${row.productName} at ${row.salesPointName}?`,
    );
    if (!confirmed) {
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await getElectronApi().carryForward.delete({
        userId: user.id,
        detailId: row.detailId,
      });
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      await reload();
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete.",
      );
    }
  }

  useEffect(() => {
    if (!batchDialog?.focusCustomerId) {
      return;
    }
    const el = document.getElementById(
      `cf-qty-${batchDialog.focusCustomerId}`,
    ) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }, [batchDialog?.focusCustomerId, batchSalesPointId, batchProductId]);

  return (
    <div class="cf-screen">
      <header class="cf-header">
        <div>
          <h2 class="cf-title">Carry-forward commitments</h2>
          <p class="cf-subtitle">
            Batch-enter opening balances per collection point and product across customers.
            Statistics clerks submit pending CF delivery orders for validation; supervisors and
            managers with validate access save them as live commitments immediately.
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
      {actionSuccess ? <p class="cf-success">{actionSuccess}</p> : null}
      {actionError && !batchDialog ? <p class="cf-error">{actionError}</p> : null}

      <div class="cf-toolbar">
        <input
          class="cf-search"
          type="search"
          value={search}
          placeholder="Search customer, product, collection point, DO…"
          onInput={(event) =>
            setSearch((event.currentTarget as HTMLInputElement).value)
          }
        />
        <span class="cf-count">
          {loading
            ? "Loading…"
            : [
                `${filtered.length} live`,
                filteredPending.length > 0
                  ? `${filteredPending.length} pending validation`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </span>
      </div>

      {filteredPending.length > 0 ? (
        <section class="cf-pending-section">
          <div class="cf-pending-header">
            <h3>Awaiting validation</h3>
            <p>
              {filteredPending.length} line
              {filteredPending.length === 1 ? "" : "s"} across {pendingDoCount} DO
              {pendingDoCount === 1 ? "" : "s"}
            </p>
          </div>
          <div class="cf-table-wrap">
            <table class="cf-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Collection point</th>
                  <th>Product</th>
                  <th class="cf-num">Outstanding (kg)</th>
                  <th>CF DO</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((row) => (
                  <tr key={row.detailId}>
                    <td>
                      <span class="cf-pending-badge">Pending validation</span>
                    </td>
                    <td>{row.dateIssued}</td>
                    <td>{row.customerName}</td>
                    <td>{row.salesPointName}</td>
                    <td>{row.productName}</td>
                    <td class="cf-num">{formatKg(row.outstandingQty)}</td>
                    <td>
                      <code>{row.deliveryOrderNo}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {pendingRows.length > 0 ? (
        <h3 class="cf-posted-title">Live commitments</h3>
      ) : null}

      <div class="cf-table-wrap">
        <table class="cf-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Collection point</th>
              <th>Product</th>
              <th>CF DO</th>
              <th class="cf-num">Outstanding (kg)</th>
              <th class="cf-num">Sold (kg)</th>
              <th class="cf-num">Order qty</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} class="cf-empty">
                  No carry-forward commitments yet. Use Batch entry to add them.
                </td>
              </tr>
            ) : null}
            {filtered.map((row) => (
              <tr key={row.detailId}>
                <td>{row.customerName}</td>
                <td>{row.salesPointName}</td>
                <td>{row.productName}</td>
                <td>
                  <code>{row.deliveryOrderNo}</code>
                </td>
                <td class="cf-num">{formatKg(row.outstandingQty)}</td>
                <td class="cf-num">{formatKg(row.soldQty)}</td>
                <td class="cf-num">{formatKg(row.orderQty)}</td>
                <td class="cf-actions">
                  {canWrite ? (
                    <>
                      <button
                        type="button"
                        class="cf-link"
                        onClick={() =>
                          openBatchEntry({
                            salesPointId: row.salesPointId,
                            productId: row.productId,
                            focusCustomerId: row.customerId,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="cf-link cf-link-danger"
                        onClick={() => void removeRow(row)}
                      >
                        Delete
                      </button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {batchDialog && options ? (
        <FormDialog
          ariaLabel="Batch carry-forward entry"
          title="Batch carry-forward entry"
          subtitle="Pick collection point and product, then enter outstanding kg per customer."
          wide
          onClose={() => {
            if (!saving) {
              setBatchDialog(null);
              setActionError(null);
            }
          }}
        >
          <div class="cf-batch">
            <div class="cf-batch-scope">
              <label class="cf-field">
                <span>Collection point</span>
                <select
                  value={batchSalesPointId}
                  disabled={saving}
                  onChange={(event) => {
                    const next = (event.currentTarget as HTMLSelectElement).value;
                    onBatchScopeChange(next, batchProductId);
                  }}
                >
                  <option value="">Select collection point…</option>
                  {options.salesPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.name}
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
                  {options.products.map((product) => (
                    <option key={product.productId} value={product.productId}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </label>

              <label class="cf-field cf-field-notes">
                <span>Notes</span>
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
                value={customerFilter}
                placeholder="Filter customers…"
                disabled={saving || !batchSalesPointId || !batchProductId}
                onInput={(event) =>
                  setCustomerFilter((event.currentTarget as HTMLInputElement).value)
                }
              />
              <span class="cf-count">
                {batchCustomers.length} customer
                {batchCustomers.length === 1 ? "" : "s"}
              </span>
            </div>

            {!batchSalesPointId || !batchProductId ? (
              <p class="cf-hint">Select collection point and product to load the customer grid.</p>
            ) : (
              <div class="cf-batch-grid-wrap">
                <table class="cf-table cf-batch-grid">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th class="cf-num">Sold (kg)</th>
                      <th class="cf-num">Outstanding (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchCustomers.map((customer) => {
                      const existing = existingForBatch.get(customer.id);
                      const key = String(customer.id);
                      return (
                        <tr key={customer.id}>
                          <td>
                            {customer.name}
                            {existing && existing.soldQty > 0 ? (
                              <span class="cf-hint-inline">
                                {" "}
                                · sold against {existing.deliveryOrderNo}
                              </span>
                            ) : null}
                          </td>
                          <td class="cf-num">
                            {existing ? formatKg(existing.soldQty) : "—"}
                          </td>
                          <td class="cf-num">
                            <input
                              id={`cf-qty-${customer.id}`}
                              class="cf-qty-input"
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              disabled={saving}
                              value={qtyByCustomer[key] ?? ""}
                              placeholder="—"
                              onInput={(event) => {
                                const value = (
                                  event.currentTarget as HTMLInputElement
                                ).value;
                                setQtyByCustomer((current) => ({
                                  ...current,
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
                {saving ? "Saving…" : "Save batch"}
              </button>
              <button
                type="button"
                class="form-dialog-btn-secondary"
                disabled={saving}
                onClick={() => {
                  setBatchDialog(null);
                  setActionError(null);
                }}
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
