import { useEffect, useMemo, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import type {
  BinCardConditionFilter,
  BinCardQuery,
  BinCardReport,
  ProductOption,
  SalesPointOption,
  StockBootstrap,
  StorageLocationOption,
} from "../../shared/stock.types.ts";
import type { OpenPostingPeriod } from "../../shared/financialYears.types.ts";
import type { AuthUser } from "../auth/session.ts";
import { getAuthToken } from "../auth/db.ts";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedFinancialYears } from "../auth/financialYears.ts";
import {
  clampIsoDateToRange,
  formatDate,
  locationsForSalesPoint,
  utcIsoDateToday,
} from "./stockUtils.ts";
import "./StockScreen.css";
import "./BinCardScreen.css";

interface BinCardScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
}

function formatQty(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0000005) {
    return "—";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function buildQuery(input: {
  productId: string;
  salesPointId: string;
  storageLocationId: string;
  condition: BinCardConditionFilter;
  fromIso: string;
  toIso: string;
}): BinCardQuery | null {
  if (!input.productId || !input.fromIso || !input.toIso) {
    return null;
  }
  return {
    productId: Number(input.productId),
    salesPointId: input.salesPointId ? Number(input.salesPointId) : null,
    storageLocationId: input.storageLocationId
      ? Number(input.storageLocationId)
      : null,
    condition: input.condition,
    fromIso: input.fromIso,
    toIso: input.toIso,
  };
}

export function BinCardScreen({ user }: BinCardScreenProps) {
  const [bootstrap, setBootstrap] = useState<StockBootstrap | null>(null);
  const [postingPeriod, setPostingPeriod] = useState<OpenPostingPeriod | null>(
    null,
  );
  const [productSearch, setProductSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [salesPointId, setSalesPointId] = useState("");
  const [storageLocationId, setStorageLocationId] = useState("");
  const [condition, setCondition] =
    useState<BinCardConditionFilter>("SELLABLE");
  const [fromIso, setFromIso] = useState("");
  const [toIso, setToIso] = useState("");
  const [report, setReport] = useState<BinCardReport | null>(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [openingReport, setOpeningReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingBootstrap(true);
      setError(null);
      try {
        const [data, period] = await Promise.all([
          getElectronApi().stock.getBootstrap(user.id),
          getAuthenticatedFinancialYears().getOpenPostingPeriod(),
        ]);
        if (cancelled) return;
        setBootstrap(data);
        setPostingPeriod(period);
        if (!period) {
          setError("Open a financial month before using the bin card.");
          setFromIso("");
          setToIso("");
        } else {
          const start = period.startDate.slice(0, 10);
          const end = clampIsoDateToRange(utcIsoDateToday(), period);
          setFromIso(start);
          setToIso(end);
        }
        if (data.scopedSalesPointId != null) {
          setSalesPointId(String(data.scopedSalesPointId));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load stock options.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingBootstrap(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const products: ProductOption[] = bootstrap?.products ?? [];
  const salesPoints: SalesPointOption[] = bootstrap?.salesPoints ?? [];
  const storageLocations: StorageLocationOption[] =
    bootstrap?.storageLocations ?? [];

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) =>
      product.productName.toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  const locationOptions = useMemo(() => {
    if (!salesPointId) {
      return storageLocations;
    }
    return locationsForSalesPoint(storageLocations, salesPointId);
  }, [salesPointId, storageLocations]);

  useEffect(() => {
    if (
      storageLocationId &&
      !locationOptions.some((loc) => String(loc.id) === storageLocationId)
    ) {
      setStorageLocationId("");
    }
  }, [locationOptions, storageLocationId]);

  async function applyFilters() {
    if (!postingPeriod) {
      setError("Open a financial month before using the bin card.");
      return;
    }
    const clampedFrom = clampIsoDateToRange(fromIso, postingPeriod);
    const clampedTo = clampIsoDateToRange(toIso, postingPeriod);
    const query = buildQuery({
      productId,
      salesPointId,
      storageLocationId,
      condition,
      fromIso: clampedFrom,
      toIso: clampedTo < clampedFrom ? clampedFrom : clampedTo,
    });
    if (!query) {
      setError("Select a product and date range.");
      return;
    }

    setFromIso(query.fromIso);
    setToIso(query.toIso);
    setLoadingReport(true);
    setError(null);
    try {
      const data = await getElectronApi().stock.getBinCard(user.id, query);
      setReport(data);
    } catch (loadError) {
      setReport(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load bin card.",
      );
    } finally {
      setLoadingReport(false);
    }
  }

  async function openReportWindow() {
    if (!postingPeriod) {
      setError("Open a financial month before using the bin card.");
      return;
    }
    const clampedFrom = clampIsoDateToRange(fromIso, postingPeriod);
    const clampedTo = clampIsoDateToRange(toIso, postingPeriod);
    const query = buildQuery({
      productId,
      salesPointId,
      storageLocationId,
      condition,
      fromIso: clampedFrom,
      toIso: clampedTo < clampedFrom ? clampedFrom : clampedTo,
    });
    if (!query) {
      setError("Select a product and date range, then Apply before opening the report.");
      return;
    }
    if (!report) {
      setError("Apply filters first, then open the report window.");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError("Login required.");
      return;
    }

    setOpeningReport(true);
    setError(null);
    try {
      const result = await getElectronApi().windows.openReport(
        token,
        "stock-bin-card-report",
        query,
      );
      if (!result.ok) {
        setError(result.error);
      }
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Failed to open report window.",
      );
    } finally {
      setOpeningReport(false);
    }
  }

  if (loadingBootstrap) {
    return <p class="scr-status">Loading bin card…</p>;
  }

  return (
    <div class="stock-screen bincard-page">
      <header class="stock-header">
        <h1>Bin card</h1>
        <p class="stock-header-subtitle">
          Track stock movements for a product with opening balance, receipts,
          issues, and running balance. Open the printable report in a separate
          window.
        </p>
      </header>

      <section class="stock-section">
        <div class="bincard-filters">
          <label>
            Product search
            <input
              type="search"
              value={productSearch}
              onInput={(event) =>
                setProductSearch((event.target as HTMLInputElement).value)
              }
              placeholder="Filter products…"
            />
          </label>
          <label>
            Product
            <select
              value={productId}
              onChange={(event) =>
                setProductId((event.target as HTMLSelectElement).value)
              }
            >
              <option value="">Select product…</option>
              {filteredProducts.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.productName} ({product.uom})
                </option>
              ))}
            </select>
          </label>
          <label>
            Sales point
            <select
              value={salesPointId}
              disabled={bootstrap?.scopedSalesPointId != null}
              onChange={(event) => {
                setSalesPointId((event.target as HTMLSelectElement).value);
                setStorageLocationId("");
              }}
            >
              {bootstrap?.scopedSalesPointId == null ? (
                <option value="">All sales points</option>
              ) : null}
              {salesPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Storage location
            <select
              value={storageLocationId}
              onChange={(event) =>
                setStorageLocationId((event.target as HTMLSelectElement).value)
              }
            >
              <option value="">All locations</option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Condition
            <select
              value={condition}
              onChange={(event) =>
                setCondition(
                  (event.target as HTMLSelectElement)
                    .value as BinCardConditionFilter,
                )
              }
            >
              <option value="SELLABLE">Sellable</option>
              <option value="UNSELLABLE">Unsellable</option>
              <option value="ALL">All</option>
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={fromIso}
              min={postingPeriod?.startDate}
              max={postingPeriod?.endDate}
              disabled={!postingPeriod}
              onInput={(event) => {
                const raw = (event.target as HTMLInputElement).value;
                const next = clampIsoDateToRange(raw, postingPeriod);
                setFromIso(next);
                if (toIso && toIso < next) {
                  setToIso(next);
                }
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={toIso}
              min={postingPeriod?.startDate}
              max={postingPeriod?.endDate}
              disabled={!postingPeriod}
              onInput={(event) => {
                const raw = (event.target as HTMLInputElement).value;
                const next = clampIsoDateToRange(raw, postingPeriod);
                setToIso(fromIso && next < fromIso ? fromIso : next);
              }}
            />
          </label>
          <div class="bincard-filter-actions">
            <button
              type="button"
              class="scr-btn"
              disabled={loadingReport || !postingPeriod}
              onClick={() => void applyFilters()}
            >
              {loadingReport ? "Loading…" : "Apply"}
            </button>
            <button
              type="button"
              class="scr-btn scr-btn-secondary"
              disabled={!report || openingReport}
              onClick={() => void openReportWindow()}
            >
              {openingReport ? "Opening…" : "Open report"}
            </button>
          </div>
        </div>

        {error ? <p class="stock-error">{error}</p> : null}

        {report?.truncated ? (
          <p class="bincard-warning">
            Showing the first 5,000 movements in range. Narrow the date range or
            filters for a full ledger.
          </p>
        ) : null}

        {report ? (
          <>
            <div class="stock-section-header">
              <div>
                <h2>{report.productName}</h2>
                <p class="stock-hint">
                  {report.salesPointLabel} · {report.storageLocationLabel} ·{" "}
                  {formatDate(report.fromIso)} – {formatDate(report.toIso)} ·{" "}
                  {report.uom}
                </p>
              </div>
              <div class="stock-hint">
                Opening {formatQty(report.openingBalance)} · Closing{" "}
                {formatQty(report.closingBalance)}
              </div>
            </div>

            <div class="stock-table-wrap">
              <table class="stock-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Particulars</th>
                    <th class="stock-num">In</th>
                    <th class="stock-num">Out</th>
                    <th class="stock-num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="stock-nowrap">{formatDate(report.fromIso)}</td>
                    <td>—</td>
                    <td class="stock-strong">Opening balance</td>
                    <td class="stock-num">—</td>
                    <td class="stock-num">—</td>
                    <td class="stock-num stock-strong">
                      {formatQty(report.openingBalance)}
                    </td>
                  </tr>
                  {report.lines.map((line) => (
                    <tr key={line.id}>
                      <td class="stock-nowrap">
                        {formatDate(line.occurredAtIso)}
                      </td>
                      <td class="stock-mono">{line.reference}</td>
                      <td>
                        {line.particulars}
                        {report.salesPointId == null ||
                        report.storageLocationId == null ? (
                          <div class="stock-subtext">
                            {line.salesPointName}
                            {report.storageLocationId == null
                              ? ` · ${line.storageLocationName}`
                              : ""}
                          </div>
                        ) : null}
                      </td>
                      <td class="stock-num stock-text-positive">
                        {line.qtyIn > 0 ? formatQty(line.qtyIn) : "—"}
                      </td>
                      <td class="stock-num stock-text-negative">
                        {line.qtyOut > 0 ? formatQty(line.qtyOut) : "—"}
                      </td>
                      <td class="stock-num">{formatQty(line.balance)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td class="stock-nowrap">{formatDate(report.toIso)}</td>
                    <td>—</td>
                    <td class="stock-strong">Closing balance</td>
                    <td class="stock-num">—</td>
                    <td class="stock-num">—</td>
                    <td class="stock-num stock-strong">
                      {formatQty(report.closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : !loadingReport ? (
          <p class="stock-muted">
            Select a product and date range, then click Apply.
          </p>
        ) : null}
      </section>
    </div>
  );
}
