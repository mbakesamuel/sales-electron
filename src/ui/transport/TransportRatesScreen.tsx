import { useEffect, useMemo, useState } from "preact/hooks";
import { formatDisplayDate as formatDate } from "../../shared/formatDisplayDate.ts";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { RowActions } from "../components/RowActions.tsx";
import { TransportRateFormModal } from "./TransportRateFormModal.tsx";
import "../customers/CustomersScreen.css";

type SortKey =
  | "salesPointLabel"
  | "productLabel"
  | "ratePerKg"
  | "effectiveFrom";

type SortDir = "asc" | "desc";

interface TransportRateRow {
  id: string;
  salesPointId: number;
  salesPointLabel: string;
  productId: number;
  productLabel: string;
  productCode: string;
  ratePerKg: string;
  ratePerKgNumeric: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
  raw: Record<string, unknown>;
}

type FormState = { mode: "create" } | { mode: "edit"; row: Record<string, unknown> };

const PAGE_SIZE = 8;

function formatRate(value: string): string {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value || "—";
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

interface TransportRatesScreenProps {
  readOnly?: boolean;
}

export function TransportRatesScreen({ readOnly = false }: TransportRatesScreenProps = {}) {
  const canWrite = !readOnly;
  const [rows, setRows] = useState<TransportRateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("effectiveFrom");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const api = getElectronApi();
        const [rateResult, productResult, salesPointResult] = await Promise.all([
          api.db.queryTable({ table: "TransportRateSchedule", limit: 500 }),
          api.db.queryTable({ table: "Product", limit: 500 }),
          api.db.queryTable({ table: "SalesPoint", limit: 500 }),
        ]);
        if (cancelled) return;

        const productMap = new Map<number, { label: string; code: string }>();
        for (const product of productResult.rows) {
          const id = Number(product.productId);
          productMap.set(id, {
            label: String(product.productName ?? id),
            code: product.productCode ? String(product.productCode) : "—",
          });
        }

        const salesPointMap = new Map<number, string>(
          salesPointResult.rows.map((row) => [
            Number(row.id),
            String(row.name ?? row.id),
          ]),
        );

        const mapped = rateResult.rows.map((row) => {
          const productId = Number(row.productId);
          const salesPointId = Number(row.salesPointId);
          const product = productMap.get(productId);
          const ratePerKg = String(row.ratePerKg ?? "");

          return {
            id: String(row.id ?? ""),
            salesPointId,
            salesPointLabel: salesPointMap.get(salesPointId) ?? String(salesPointId),
            productId,
            productLabel: product?.label ?? String(productId),
            productCode: product?.code ?? "—",
            ratePerKg,
            ratePerKgNumeric: Number(ratePerKg) || 0,
            effectiveFrom: formatDate(row.effectiveFrom),
            createdAt: formatDate(row.createdAt),
            updatedAt: formatDate(row.updatedAt),
            raw: row,
          } satisfies TransportRateRow;
        });

        setRows(mapped);
      } catch (loadError) {
        if (!cancelled) {
          setRows([]);
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load transport rates.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (!query) return true;
      return [
        row.salesPointLabel,
        row.productLabel,
        row.productCode,
        row.ratePerKg,
        row.effectiveFrom,
      ].some((part) => part.toLowerCase().includes(query));
    });
  }, [rows, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((left, right) => {
      let cmp = 0;
      switch (sortKey) {
        case "salesPointLabel":
          cmp = left.salesPointLabel.localeCompare(right.salesPointLabel);
          break;
        case "productLabel":
          cmp = left.productLabel.localeCompare(right.productLabel);
          break;
        case "ratePerKg":
          cmp = left.ratePerKgNumeric - right.ratePerKgNumeric;
          break;
        case "effectiveFrom":
          cmp = left.effectiveFrom.localeCompare(right.effectiveFrom);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  async function handleDelete(row: TransportRateRow) {
    setActionError(null);
    try {
      await getAuthenticatedDb().deleteRow({
        table: "TransportRateSchedule",
        primaryKey: { id: row.id },
      });
      setRefreshKey((current) => current + 1);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete transport rate.",
      );
    }
  }

  if (isLoading) {
    return <p class="customers-status">Loading transport rates…</p>;
  }

  if (error) {
    return <p class="customers-status customers-status-error">{error}</p>;
  }

  return (
    <div class="customers-page">
      <div class="customers-toolbar">
        <div class="customers-toolbar-left">
          <input
            type="search"
            class="customers-search"
            placeholder="Search collection point, product, rate…"
            value={search}
            onInput={(event) => {
              setSearch((event.currentTarget as HTMLInputElement).value);
              setPage(1);
            }}
          />
        </div>
        {canWrite ? (
          <button
            type="button"
            class="customers-btn customers-btn-primary"
            onClick={() => setFormState({ mode: "create" })}
          >
            Add rate
          </button>
        ) : null}
      </div>

      {actionError ? <p class="customers-banner customers-banner-error">{actionError}</p> : null}

      <div class="customers-table-wrap">
        <table class="customers-table">
          <thead>
            <tr>
              <th>
                <button type="button" class="customers-sort-btn" onClick={() => toggleSort("salesPointLabel")}>
                  Collection point
                </button>
              </th>
              <th>
                <button type="button" class="customers-sort-btn" onClick={() => toggleSort("productLabel")}>
                  Product
                </button>
              </th>
              <th>
                <button type="button" class="customers-sort-btn" onClick={() => toggleSort("ratePerKg")}>
                  Rate/kg (XAF)
                </button>
              </th>
              <th>
                <button type="button" class="customers-sort-btn" onClick={() => toggleSort("effectiveFrom")}>
                  Effective from
                </button>
              </th>
              {canWrite ? <th class="customers-actions-col">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={canWrite ? 5 : 4} class="customers-empty">
                  No transport rates found.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.salesPointLabel}</td>
                  <td>
                    {row.productLabel}
                    <span class="customers-muted"> ({row.productCode})</span>
                  </td>
                  <td>{formatRate(row.ratePerKg)}</td>
                  <td>{row.effectiveFrom}</td>
                  {canWrite ? (
                    <td>
                      <RowActions
                        onView={() => setFormState({ mode: "edit", row: row.raw })}
                        onEdit={() => setFormState({ mode: "edit", row: row.raw })}
                        onDelete={() => void handleDelete(row)}
                        canWrite={canWrite}
                      />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div class="customers-pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </button>
        </div>
      ) : null}

      {formState ? (
        <TransportRateFormModal
          mode={formState.mode}
          row={formState.mode === "edit" ? formState.row : undefined}
          onClose={() => setFormState(null)}
          onSaved={() => {
            setFormState(null);
            setRefreshKey((current) => current + 1);
          }}
        />
      ) : null}
    </div>
  );
}
