import { useEffect, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { canWriteRouteFromSnapshot } from "../../shared/permissionUtils.ts";
import type {
  TransportCostComputeResult,
  TransportCostFormOptions,
} from "../../shared/transportCost.types.ts";
import { getAuthToken } from "../auth/db.ts";
import { getElectronApi } from "../auth/client.ts";
import "../commitments/CarryForwardCommitmentsScreen.css";
import "../reports/StockCommitmentReport.css";
import { printPortraitDocument } from "../reports/printPortraitDocument.ts";
import "./TransportCostComputeScreen.css";

interface TransportCostComputeScreenProps {
  permissions: RolePermissionsSnapshot;
  readOnly?: boolean;
}

function formatKg(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatMoney(value: number | null): string {
  if (value == null) return "—";
  return Math.round(value).toLocaleString("en-US");
}

export function TransportCostComputeScreen({
  permissions,
  readOnly = false,
}: TransportCostComputeScreenProps) {
  const canCompute =
    canWriteRouteFromSnapshot(permissions, "transport-cost-compute") && !readOnly;

  const [options, setOptions] = useState<TransportCostFormOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<TransportCostComputeResult | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [salesPointId, setSalesPointId] = useState("");
  const [productId, setProductId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const formOptions = await getElectronApi().transportCost.getFormOptions();
        if (!cancelled) {
          setOptions(formOptions);
        }
      } catch (loadError) {
        if (!cancelled) {
          setOptions(null);
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load form options.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCompute() {
    setActionError(null);
    setResult(null);

    const parsedCustomerId = Number.parseInt(customerId, 10);
    const parsedSalesPointId = Number.parseInt(salesPointId, 10);
    const parsedProductId = Number.parseInt(productId, 10);

    if (!customerId || Number.isNaN(parsedCustomerId)) {
      setActionError("Select a customer.");
      return;
    }
    if (!salesPointId || Number.isNaN(parsedSalesPointId)) {
      setActionError("Select a collection point.");
      return;
    }
    if (!productId || Number.isNaN(parsedProductId)) {
      setActionError("Select a product.");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setActionError("Login required.");
      return;
    }

    setComputing(true);
    try {
      const computeResult = await getElectronApi().transportCost.compute(token, {
        customerId: parsedCustomerId,
        salesPointId: parsedSalesPointId,
        productId: parsedProductId,
      });
      setResult(computeResult);
    } catch (computeError) {
      setActionError(
        computeError instanceof Error ? computeError.message : "Failed to compute transport cost.",
      );
    } finally {
      setComputing(false);
    }
  }

  if (loading) {
    return <p class="cf-status">Loading…</p>;
  }

  if (error) {
    return <p class="cf-status cf-status-error">{error}</p>;
  }

  if (!options?.openPeriod) {
    return (
      <p class="cf-status cf-status-error">
        Open a financial month before computing transportation cost.
      </p>
    );
  }

  const period = options.openPeriod;

  return (
    <div class="cf-page">
      <div class="cf-header tcc-no-print">
        <div>
          <h2 class="cf-title">Transportation cost</h2>
          <p class="cf-subtitle">
            Open month: {period.monthName} {period.financialYear} ({period.startDate} to{" "}
            {result?.asAtIso ?? period.endDate})
          </p>
        </div>
      </div>

      <section class="tcc-filters-section tcc-no-print" aria-label="Transport cost filters">
        <div class="cf-filters">
          <label class="cf-field">
            <span>Customer</span>
            <select
              value={customerId}
              onInput={(event) =>
                setCustomerId((event.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="">Select customer…</option>
              {options.customers.map((customer) => (
                <option key={customer.id} value={String(customer.id)}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <label class="cf-field">
            <span>Collection point</span>
            <select
              value={salesPointId}
              onInput={(event) =>
                setSalesPointId((event.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="">Select collection point…</option>
              {options.salesPoints.map((point) => (
                <option key={point.id} value={String(point.id)}>
                  {point.name}
                </option>
              ))}
            </select>
          </label>

          <label class="cf-field">
            <span>Product</span>
            <select
              value={productId}
              onInput={(event) =>
                setProductId((event.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="">Select product…</option>
              {options.products.map((product) => (
                <option key={product.productId} value={String(product.productId)}>
                  {product.productName}
                  {product.productCode ? ` (${product.productCode})` : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            class="cf-btn cf-btn-primary"
            disabled={
              !canCompute ||
              computing ||
              options.salesPoints.length === 0
            }
            onClick={() => void handleCompute()}
          >
            {computing ? "Computing…" : "Compute"}
          </button>
        </div>
      </section>

      {options.policyNotice ? (
        <p
          class={`cf-banner tcc-no-print ${
            options.policyNotice.includes("no active collection point")
              ? "cf-banner-error"
              : "tcc-policy-notice"
          }`}
        >
          {options.policyNotice}
        </p>
      ) : null}

      {actionError ? <p class="cf-banner cf-banner-error tcc-no-print">{actionError}</p> : null}

      {result?.warnings.length ? (
        <div class="cf-banner cf-banner-warning tcc-no-print">
          {result.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {result ? (
        <section class="tcc-results-section" aria-label="Transport cost results">
          <div class="tcc-results-inner">
            <article class="scr-document tcc-print-document">
              <header class="tcc-print-header">
                <h2 class="tcc-print-title">Transportation cost</h2>
                <p class="tcc-print-subtitle">
                  {result.customerName} · {result.salesPointName} · {result.productName}
                </p>
                <p class="tcc-print-subtitle">
                  Open month: {period.monthName} {period.financialYear} ({period.startDate}{" "}
                  to {result.asAtIso})
                </p>
              </header>

              <div class="tcc-print-summary">
                <p>
                  Total lifted: <strong>{formatKg(result.totalQtyKg)} kg</strong>
                </p>
                <p>
                  Total transport cost: <strong>{formatMoney(result.totalCost)} XAF</strong>
                </p>
              </div>

              {result.warnings.length ? (
                <div class="tcc-print-warnings">
                  {result.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}

              {result.lines.length === 0 ? (
                <p class="cf-empty">
                  No validated lifts found for this selection in the open month.
                </p>
              ) : (
                <div class="cf-table-wrap tcc-print-table-wrap">
                  <table class="cf-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th>DO No</th>
                        <th class="cf-num">Qty (kg)</th>
                        <th class="cf-num">Rate/kg</th>
                        <th class="cf-num">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.lines.map((line, index) => (
                        <tr key={`${line.dateIssued}-${line.invoiceNo ?? index}`}>
                          <td>{line.dateIssued}</td>
                          <td>{line.invoiceNo ?? "—"}</td>
                          <td>{line.deliveryOrderNo ?? "—"}</td>
                          <td class="cf-num">{formatKg(line.qtyKg)}</td>
                          <td class="cf-num">
                            {line.rateMissing ? "—" : formatMoney(line.ratePerKg)}
                          </td>
                          <td class="cf-num">
                            {line.rateMissing ? "—" : formatMoney(line.lineCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <div class="tcc-results-actions no-print">
              <button
                type="button"
                class="scr-btn tcc-print-btn"
                onClick={() => printPortraitDocument()}
              >
                Print
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
