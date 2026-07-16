import { useMemo, useState } from "preact/hooks";
import type {
  SalesPointOption,
  StockMovementKind,
  StockMovementRow,
} from "../../shared/stock.types.ts";
import { STOCK_MOVEMENT_KIND_LABELS, movementQtyColumns } from "./stockDisplay.ts";
import { formatDateTime, trimQty } from "./stockUtils.ts";

interface MovementsTabProps {
  rows: StockMovementRow[];
  salesPoints: SalesPointOption[];
  scopedSalesPointId: number | null;
}

export function MovementsTab({ rows, salesPoints, scopedSalesPointId }: MovementsTabProps) {
  const [salesPointId, setSalesPointId] = useState<string>(
    scopedSalesPointId != null ? String(scopedSalesPointId) : "",
  );
  const [kind, setKind] = useState<string>("");
  const [search, setSearch] = useState("");

  const displayRows = useMemo(() => {
    // Group reclassification pairs into a single display row:
    // same adjustment source + product + location + sales point + occurredAt + qty,
    // one SELLABLE and one UNSELLABLE side, notes starting with "Reclassify".
    const byKey = new Map<string, StockMovementRow[]>();
    const singles: StockMovementRow[] = [];

    for (const r of rows) {
      const isReclassCandidate =
        r.kind === "ADJUSTMENT" &&
        r.sourceKind === "ADJUSTMENT" &&
        (r.notes ?? "").startsWith("Reclassify ");
      if (!isReclassCandidate) {
        singles.push(r);
        continue;
      }
      const k = [
        r.sourceKind,
        r.sourceId,
        r.salesPointId,
        r.storageLocationId,
        r.productId,
        r.occurredAtIso,
        r.qty,
      ].join("|");
      const arr = byKey.get(k);
      if (arr) arr.push(r);
      else byKey.set(k, [r]);
    }

    const grouped: StockMovementRow[] = [];
    for (const [, pair] of byKey) {
      if (pair.length !== 2) {
        singles.push(...pair);
        continue;
      }
      const a = pair[0]!;
      const b = pair[1]!;
      const conds = new Set([a.condition, b.condition]);
      if (!(conds.has("SELLABLE") && conds.has("UNSELLABLE"))) {
        singles.push(...pair);
        continue;
      }

      const from = a.condition === "SELLABLE" ? a : b;
      const to = a.condition === "UNSELLABLE" ? a : b;
      grouped.push({
        ...from,
        id: `RECLASS:${from.sourceId}:${from.productId}:${from.storageLocationId}:${from.occurredAtIso}:${from.qty}`,
        condition: "SELLABLE",
        notes: from.notes ?? `Reclassify ${from.condition} -> ${to.condition}`,
      });
    }

    const all = [...singles, ...grouped];
    all.sort((a, b) => {
      const da = Date.parse(a.occurredAtIso);
      const db = Date.parse(b.occurredAtIso);
      if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return db - da;
      const ca = Date.parse(a.createdAtIso);
      const cb = Date.parse(b.createdAtIso);
      if (Number.isFinite(ca) && Number.isFinite(cb) && ca !== cb) return cb - ca;
      return a.id.localeCompare(b.id);
    });
    return all;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayRows.filter((r) => {
      if (salesPointId && String(r.salesPointId) !== salesPointId) return false;
      if (kind && r.kind !== kind) return false;
      if (q) {
        const blob =
          `${r.productName} ${r.salesPointName} ${r.storageLocationName} ${r.documentNo ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [displayRows, salesPointId, kind, search]);

  return (
    <section class="stock-section">
      <div class="stock-filters">
        {scopedSalesPointId == null ? (
          <label class="stock-field">
            <span>Sales point</span>
            <select
              value={salesPointId}
              onChange={(event) =>
                setSalesPointId((event.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="">All</option>
              {salesPoints.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label class="stock-field">
          <span>Kind</span>
          <select
            value={kind}
            onChange={(event) => setKind((event.currentTarget as HTMLSelectElement).value)}
          >
            <option value="">All</option>
            {(Object.keys(STOCK_MOVEMENT_KIND_LABELS) as StockMovementKind[]).map((k) => (
              <option key={k} value={k}>
                {STOCK_MOVEMENT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label class="stock-field stock-field-grow">
          <span>Search</span>
          <input
            value={search}
            onInput={(event) => setSearch((event.currentTarget as HTMLInputElement).value)}
            placeholder="Product, sales point, doc#, user"
          />
        </label>
      </div>

      <div class="stock-table-wrap">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Doc #</th>
              <th>When</th>
              <th>Sales point</th>
              <th>Location</th>
              <th>Condition</th>
              <th>Product</th>
              <th>Kind</th>
              <th class="stock-num">+ Qty</th>
              <th class="stock-num">− Qty</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} class="stock-empty-cell">
                  No movements match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const { plus, minus } = movementQtyColumns(r, trimQty);
                return (
                  <tr key={r.id}>
                    <td class="stock-muted">{r.documentNo ?? "—"}</td>
                    <td class="stock-nowrap" title={r.createdAtIso}>
                      {formatDateTime(r.occurredAtIso)}
                    </td>
                    <td>{r.salesPointName}</td>
                    <td>{r.storageLocationName}</td>
                    <td class="stock-muted">
                      {r.kind === "ADJUSTMENT" && (r.notes ?? "").startsWith("Reclassify ")
                        ? "Sellable→Unsellable"
                        : r.condition === "SELLABLE"
                          ? "Sellable"
                          : "Unsellable"}
                    </td>
                    <td>{r.productName}</td>
                    <td class="stock-nowrap">{STOCK_MOVEMENT_KIND_LABELS[r.kind]}</td>
                    <td class="stock-num stock-strong stock-text-positive">{plus ?? "—"}</td>
                    <td class="stock-num stock-strong stock-text-negative">{minus ?? "—"}</td>
                    <td class="stock-muted">{r.notes ?? ""}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 ? (
        <p class="stock-hint">
          Showing the latest {filtered.length} movement{filtered.length === 1 ? "" : "s"}
          {filtered.length >= 200 ? " (use filters to narrow further)." : "."}
        </p>
      ) : null}
    </section>
  );
}
