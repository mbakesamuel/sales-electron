import { useEffect, useMemo, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { AuthUser } from "../auth/session.ts";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedFinancialYears } from "../auth/financialYears.ts";
import type { OpenPostingPeriod } from "../../shared/financialYears.types.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { canPerformActionFromSnapshot } from "../../shared/permissionUtils.ts";
import type {
  DeliveryOrdersFormOptions,
  DeliveryOrderTaxPreview,
  PendingDeliveryOrderRow,
} from "./types.ts";
import { isValidBookletSerial } from "../../shared/bookletSerial.ts";
import "../sales/sales.css";

function clampDateToPeriod(isoDate: string, period: OpenPostingPeriod | null): string {
  if (!period) return isoDate;
  if (isoDate < period.startDate) return period.startDate;
  if (isoDate > period.endDate) return period.endDate;
  return isoDate;
}

interface DeliveryOrdersClientProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  initialLookupNo?: string;
  onOpenList: () => void;
  onOpenQueue: () => void;
}

type LineRow = {
  productId: string;
  orderQty: string;
  orderUnit: string;
  unitPrice: string;
};

type PaymentRow = {
  paymentMethodId: string;
  paymentDate: string;
  chequeNo: string;
  bank: string;
  cashReceiptNo: string;
  receiptDate: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDec(value: string): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusClass(status: string): string {
  if (status === "VALIDATED") {
    return "sales-status sales-status-validated";
  }
  if (status === "REJECTED") {
    return "sales-status sales-status-rejected";
  }
  return "sales-status sales-status-pending";
}

export function DeliveryOrdersClient({
  user,
  permissions,
  initialLookupNo = "",
  onOpenList,
  onOpenQueue,
}: DeliveryOrdersClientProps) {
  const [options, setOptions] = useState<DeliveryOrdersFormOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "ok" | "error"; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState<string | null>(null);

  const [orderId, setOrderId] = useState<number | null>(null);
  const [deliveryOrderNo, setDeliveryOrderNo] = useState("");
  const [docStatus, setDocStatus] = useState<string | null>(null);
  const [validatedByName, setValidatedByName] = useState("");
  const [lookupNo, setLookupNo] = useState(initialLookupNo);
  const [customerId, setCustomerId] = useState("");
  const [dateIssued, setDateIssued] = useState(todayIsoDate());
  const [postingPeriod, setPostingPeriod] = useState<OpenPostingPeriod | null>(null);
  const [orderRef, setOrderRef] = useState("");
  const [salesPointId, setSalesPointId] = useState("");
  const [lines, setLines] = useState<LineRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [pendingDos, setPendingDos] = useState<PendingDeliveryOrderRow[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [taxPreview, setTaxPreview] = useState<DeliveryOrderTaxPreview | null>(null);
  const [taxPreviewError, setTaxPreviewError] = useState<string | null>(null);
  const [linePriceErrors, setLinePriceErrors] = useState<Record<number, string>>({});
  const [lineOnHand, setLineOnHand] = useState<Record<number, string>>({});
  const [allowAutoUnitPrice, setAllowAutoUnitPrice] = useState(true);

  const isReadOnly = docStatus === "VALIDATED" || docStatus === "REJECTED";
  const canValidate = canPerformActionFromSnapshot(
    permissions,
    "validate_delivery_orders",
  );
  const paymentMethods = useMemo(
    () => options?.paymentMethods ?? [],
    [options],
  );
  const defaultPaymentMethodId =
    paymentMethods.find((method) => method.code === "CASH")?.id ??
    paymentMethods[0]?.id ??
    "";

  const lineSummaries = useMemo(() => {
    const vatRate = taxPreview ? parseDec(taxPreview.vatRate) : 0;
    const otherRate = taxPreview ? parseDec(taxPreview.otherRate) : 0;

    return lines.map((line) => {
      const qty = Number.parseInt(line.orderQty, 10) || 0;
      const unit = parseDec(line.unitPrice);
      const net = Math.round(qty * unit * 100) / 100;
      const vat = Math.round(net * vatRate * 100) / 100;
      const other = Math.round(net * otherRate * 100) / 100;
      const total = Math.round((net + vat + other) * 100) / 100;
      return { net, vat, other, total };
    });
  }, [lines, taxPreview]);

  const totalsPreview = useMemo(
    () =>
      lineSummaries.reduce(
        (acc, summary) => ({
          net: acc.net + summary.net,
          vat: acc.vat + summary.vat,
          other: acc.other + summary.other,
          total: acc.total + summary.total,
        }),
        { net: 0, vat: 0, other: 0, total: 0 },
      ),
    [lineSummaries],
  );

  function emptyLine(): LineRow {
    return { productId: "", orderQty: "0", orderUnit: "kg", unitPrice: "" };
  }

  function emptyPayment(): PaymentRow {
    return {
      paymentMethodId: defaultPaymentMethodId,
      paymentDate: todayIsoDate(),
      chequeNo: "",
      bank: "",
      cashReceiptNo: "",
      receiptDate: "",
    };
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const [formOptions, period] = await Promise.all([
          getElectronApi().deliveryOrders.getFormOptions(),
          getAuthenticatedFinancialYears().getOpenPostingPeriod(),
        ]);
        setOptions(formOptions);
        setPostingPeriod(period);
        setDateIssued((current) => clampDateToPeriod(current, period));
        setCustomerId(
          formOptions.customers[0]?.id != null
            ? String(formOptions.customers[0].id)
            : "",
        );
        setSalesPointId(String(formOptions.salesPoints[0]?.id ?? ""));
        setLines(formOptions.products.length > 0 ? [emptyLine()] : []);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load delivery order options.",
        );
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (initialLookupNo.trim()) {
      void loadOrder(initialLookupNo.trim());
    }
  }, [initialLookupNo]);

  useEffect(() => {
    if (!canValidate) {
      setPendingDos([]);
      return;
    }

    void getElectronApi()
      .deliveryOrders.listPending()
      .then(setPendingDos)
      .catch(() => setPendingDos([]));
  }, [canValidate, orderId]);

  useEffect(() => {
    if (!customerId) {
      setTaxPreview(null);
      setTaxPreviewError(null);
      return;
    }

    let cancelled = false;
    void getElectronApi()
      .deliveryOrders.previewTaxes({
        customerId: Number.parseInt(customerId, 10),
        dateIssued,
      })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.ok === false) {
          setTaxPreview(null);
          setTaxPreviewError(result.error);
          return;
        }
        setTaxPreview(result.preview);
        setTaxPreviewError(null);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId, dateIssued]);

  useEffect(() => {
    if (!allowAutoUnitPrice || !customerId || !options) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const errors: Record<number, string> = {};
      const prices: Record<number, string> = {};

      await Promise.all(
        lines.map(async (line, index) => {
          const productId = Number.parseInt(line.productId, 10);
          if (!Number.isFinite(productId)) {
            return;
          }

          const result = await getElectronApi().deliveryOrders.previewUnitPrice({
            customerId: Number.parseInt(customerId, 10),
            productId,
            dateIssued,
          });

          if (cancelled) {
            return;
          }

          if (result.ok === false) {
            errors[index] = result.error;
            return;
          }
          prices[index] = result.unitPriceExTax;
        }),
      );

      if (cancelled) {
        return;
      }

      setLinePriceErrors(errors);
      setLines((current) =>
        current.map((line, index) =>
          prices[index] != null ? { ...line, unitPrice: prices[index]! } : line,
        ),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [allowAutoUnitPrice, customerId, dateIssued, lines.map((l) => l.productId).join(",")]);

  useEffect(() => {
    const spId = Number.parseInt(salesPointId, 10);
    if (!Number.isFinite(spId)) {
      setLineOnHand({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const next: Record<number, string> = {};
      await Promise.all(
        lines.map(async (line, index) => {
          const productId = Number.parseInt(line.productId, 10);
          if (!Number.isFinite(productId)) {
            return;
          }

          const result = await getElectronApi().deliveryOrders.previewStockOnHand({
            salesPointId: spId,
            productId,
          });

          if (!cancelled && result.ok) {
            next[index] = result.onHand;
          }
        }),
      );

      if (!cancelled) {
        setLineOnHand(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [salesPointId, lines.map((l) => l.productId).join(",")]);

  function resetNew() {
    if (!options) {
      return;
    }

    setOrderId(null);
    setDeliveryOrderNo("");
    setDocStatus(null);
    setValidatedByName("");
    setLookupNo("");
    setCustomerId(
      options.customers[0]?.id != null ? String(options.customers[0].id) : "",
    );
    setDateIssued(todayIsoDate());
    setOrderRef("");
    setSalesPointId(String(options.salesPoints[0]?.id ?? ""));
    setLines(options.products.length > 0 ? [emptyLine()] : []);
    setPayments([]);
    setAllowAutoUnitPrice(true);
    setLinePriceErrors({});
    setBanner(null);
  }

  async function loadOrder(rawNo?: string) {
    const no = (rawNo ?? lookupNo).trim();
    if (!no) {
      return;
    }

    setBusy("load");
    setBanner(null);

    try {
      const data = await getElectronApi().deliveryOrders.loadByNo(no);
      if (!data) {
        setBanner({ type: "error", text: "Delivery order not found." });
        return;
      }

      setOrderId(data.id);
      setDeliveryOrderNo(data.deliveryOrderNo);
      setDocStatus(data.status);
      setValidatedByName(data.validatedByName ?? "");
      setLookupNo(data.deliveryOrderNo);
      setCustomerId(String(data.customerId));
      setDateIssued(data.dateIssued);
      setOrderRef(data.orderRef ?? "");
      setSalesPointId(String(data.salesPointId));
      setAllowAutoUnitPrice(false);
      setLinePriceErrors({});
      setLines(
        data.lines.length > 0
          ? data.lines.map((line) => ({
              productId: String(line.productId),
              orderQty: String(line.orderQty),
              orderUnit: line.orderUnit || "kg",
              unitPrice: line.unitPrice,
            }))
          : [emptyLine()],
      );
      setPayments(
        data.payments.length > 0
          ? data.payments.map((payment) => ({
              paymentMethodId: payment.paymentMethodId,
              paymentDate: payment.paymentDate,
              chequeNo: payment.chequeNo,
              bank: payment.bank,
              cashReceiptNo: payment.cashReceiptNo,
              receiptDate: payment.receiptDate,
            }))
          : [],
      );
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load delivery order.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function saveOrder() {
    if (!options) {
      return;
    }

    setBusy("save");
    setBanner(null);

    try {
      const spId = Number.parseInt(salesPointId, 10);
      if (!customerId.trim()) {
        setBanner({ type: "error", text: "Select a customer." });
        return;
      }
      if (!Number.isFinite(spId)) {
        setBanner({ type: "error", text: "Select a collection point." });
        return;
      }

      const result = await getElectronApi().deliveryOrders.save({
        userId: user.id,
        id: orderId,
        deliveryOrderNo: orderId == null ? deliveryOrderNo : undefined,
        customerId: Number.parseInt(customerId, 10),
        dateIssued,
        orderRef: orderRef || undefined,
        salesPointId: spId,
        lines: lines
          .filter((line) => line.productId)
          .map((line) => ({
            productId: Number.parseInt(line.productId, 10),
            orderQty: line.orderQty,
            orderUnit: line.orderUnit,
          })),
        payments: payments
          .filter((payment) => payment.paymentMethodId)
          .map((payment) => ({
            paymentMethodId: payment.paymentMethodId,
            paymentDate: payment.paymentDate,
            chequeNo: payment.chequeNo || undefined,
            bank: payment.bank || undefined,
            cashReceiptNo: payment.cashReceiptNo || undefined,
            receiptDate: payment.receiptDate || undefined,
          })),
      });

      if (result.ok === false) {
        setBanner({ type: "error", text: result.error });
        return;
      }

      setOrderId(result.id);
      setDeliveryOrderNo(result.deliveryOrderNo);
      setLookupNo(result.deliveryOrderNo);
      setDocStatus("PENDING");
      setBanner({
        type: "ok",
        text: orderId == null ? `Created ${result.deliveryOrderNo}.` : "Delivery order updated.",
      });
      await loadOrder(result.deliveryOrderNo);
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save delivery order.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function validateOrder() {
    if (orderId == null) {
      return;
    }

    setBusy("validate");
    setBanner(null);

    try {
      const result = await getElectronApi().deliveryOrders.validateOrder({
        orderId,
        userId: user.id,
      });

      if (result.ok === false) {
        setBanner({ type: "error", text: result.error });
        return;
      }

      setDocStatus("VALIDATED");
      setBanner({ type: "ok", text: "Delivery order validated." });
      await loadOrder(deliveryOrderNo);
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to validate delivery order.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function deleteOrder() {
    if (orderId == null) {
      return;
    }

    if (!window.confirm(`Delete ${deliveryOrderNo || `DO #${orderId}`}?`)) {
      return;
    }

    setBusy("delete");
    setBanner(null);

    try {
      const result = await getElectronApi().deliveryOrders.deleteOrder({
        orderId,
        userId: user.id,
      });
      if (result.ok === false) {
        setBanner({ type: "error", text: result.error });
        return;
      }

      resetNew();
      setBanner({ type: "ok", text: "Delivery order deleted." });
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete delivery order.",
      });
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return <p class="sales-error">{loadError}</p>;
  }

  if (!options) {
    return <p class="sales-muted">Loading delivery order screen…</p>;
  }

  const setupRequired =
    options.customers.length === 0 ||
    options.products.length === 0 ||
    options.salesPoints.length === 0;

  const canSave =
    busy === null &&
    !isReadOnly &&
    customerId.trim() &&
    salesPointId.trim() &&
    (orderId != null || isValidBookletSerial(deliveryOrderNo)) &&
    !taxPreviewError &&
    taxPreview != null &&
    lines.some((line) => line.productId && Number.parseInt(line.orderQty, 10) > 0);

  if (setupRequired) {
    return (
      <div class="sales-setup">
        <h3>Setup required</h3>
        <ul>
          {options.customers.length === 0 ? <li>Add at least one customer.</li> : null}
          {options.products.length === 0 ? <li>Add at least one product.</li> : null}
          {options.salesPoints.length === 0 ? <li>Add at least one sales point.</li> : null}
        </ul>
      </div>
    );
  }

  return (
    <div class="sales-client">
      {banner ? (
        <div class={`sales-banner sales-banner-${banner.type}`}>{banner.text}</div>
      ) : null}

      <div class="sales-panel">
        <div class="sales-panel-header">
          <div>
            <h3>Open existing order</h3>
            <p class="sales-muted">
              Enter the delivery order number to load the full document.
            </p>
          </div>
          <div class="sales-header-actions">
            <button type="button" class="sales-btn-secondary" onClick={onOpenList}>
              View all DOs
            </button>
            {canValidate ? (
              <button type="button" class="sales-btn-secondary" onClick={onOpenQueue}>
                Validation queue
              </button>
            ) : null}
          </div>
        </div>

        <div class="sales-lookup-row">
          <label class="sales-field sales-field-grow">
            <span>Delivery order no.</span>
            <div class="sales-lookup-input-wrap">
              <input
                type="text"
                value={lookupNo}
                disabled={busy !== null}
                placeholder="12345"
                onInput={(event) =>
                  setLookupNo((event.currentTarget as HTMLInputElement).value)
                }
              />
              {canValidate && pendingDos.length > 0 ? (
                <button
                  type="button"
                  class="sales-pending-toggle"
                  onClick={() => setPendingOpen((open) => !open)}
                >
                  {pendingDos.length} pending {pendingOpen ? "▴" : "▾"}
                </button>
              ) : null}
            </div>
            {pendingOpen && pendingDos.length > 0 ? (
              <ul class="sales-pending-list">
                {pendingDos.map((pending) => (
                  <li key={pending.deliveryOrderNo}>
                    <button
                      type="button"
                      onClick={() => {
                        setLookupNo(pending.deliveryOrderNo);
                        setPendingOpen(false);
                        void loadOrder(pending.deliveryOrderNo);
                      }}
                    >
                      <strong>{pending.deliveryOrderNo}</strong>
                      <span>
                        {pending.customerName} · {formatDisplayDate(pending.dateIssued)}
                        {pending.totalLabel ? ` · ${pending.totalLabel}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </label>

          <button
            type="button"
            class="sales-btn-primary"
            disabled={busy !== null || !lookupNo.trim()}
            onClick={() => void loadOrder()}
          >
            {busy === "load" ? "Loading…" : "Load order"}
          </button>
          <button
            type="button"
            class="sales-btn-secondary"
            disabled={busy !== null}
            onClick={resetNew}
          >
            New blank order
          </button>
        </div>
      </div>

      <div class="sales-panel">
        <div class="sales-section-header">
          <div>
            <h3>1 · Header</h3>
            {deliveryOrderNo ? (
              <p class="sales-muted">
                <span class={statusClass(docStatus ?? "PENDING")}>{docStatus ?? "DRAFT"}</span>
                {" · "}
                <strong>{deliveryOrderNo}</strong>
                {validatedByName ? ` · Validated by ${validatedByName}` : ""}
              </p>
            ) : (
              <p class="sales-muted">Create a new delivery order draft.</p>
            )}
          </div>
        </div>

        <div class="sales-invoice-form">
          <div class="sales-invoice-grid sales-invoice-grid-2">
            {orderId == null ? (
              <label class="sales-field sales-field-span-full">
                <span>Booklet serial no.</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\\d*"
                  value={deliveryOrderNo}
                  disabled={isReadOnly}
                  placeholder="12345"
                  onInput={(event) =>
                    setDeliveryOrderNo((event.currentTarget as HTMLInputElement).value)
                  }
                />
              </label>
            ) : null}

            <label class="sales-field">
              <span>Customer</span>
              <select
                value={customerId}
                disabled={isReadOnly}
                onChange={(event) => {
                  setAllowAutoUnitPrice(true);
                  setCustomerId((event.currentTarget as HTMLSelectElement).value);
                }}
              >
                {options.customers.map((customer) => (
                  <option key={customer.id} value={String(customer.id)}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>

            <label class="sales-field">
              <span>Date issued</span>
              <input
                type="date"
                value={dateIssued}
                min={postingPeriod?.startDate}
                max={postingPeriod?.endDate}
                disabled={isReadOnly || !postingPeriod}
                onInput={(event) => {
                  setAllowAutoUnitPrice(true);
                  setDateIssued((event.currentTarget as HTMLInputElement).value);
                }}
              />
              {!postingPeriod ? (
                <span class="sales-muted sales-checkbox-hint">
                  Open a financial month before posting.
                </span>
              ) : (
                <span class="sales-muted sales-checkbox-hint">
                  Open month: {postingPeriod.monthName} {postingPeriod.financialYear}
                </span>
              )}
            </label>

            <label class="sales-field">
              <span>Customer reference (optional)</span>
              <input
                type="text"
                value={orderRef}
                disabled={isReadOnly}
                placeholder="PO / contract ref"
                onInput={(event) =>
                  setOrderRef((event.currentTarget as HTMLInputElement).value)
                }
              />
            </label>

            <label class="sales-field">
              <span>Collection point</span>
              <select
                value={salesPointId}
                disabled={isReadOnly}
                onChange={(event) =>
                  setSalesPointId((event.currentTarget as HTMLSelectElement).value)
                }
              >
                {options.salesPoints.map((point) => (
                  <option key={point.id} value={String(point.id)}>
                    {point.name}
                  </option>
                ))}
              </select>
            </label>

            <div class="sales-field sales-field-span-full sales-tax-hint-row">
              <span
                class={`sales-hint${taxPreviewError ? " sales-hint-warn" : ""}`}
              >
                {taxPreviewError
                  ? taxPreviewError
                  : taxPreview
                    ? `VAT ${taxPreview.vatPercentLabel}% · Sales tax ${taxPreview.otherPercentLabel}%`
                    : "Select a customer and date to load tax rates."}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="sales-panel">
        <div class="sales-section-header">
          <div>
            <h3>2 · Line items</h3>
            <p class="sales-muted">Unit prices come from product pricing schedules.</p>
          </div>
          {!isReadOnly ? (
            <button
              type="button"
              class="sales-btn-secondary"
              onClick={() => {
                setAllowAutoUnitPrice(true);
                setLines((current) => [...current, emptyLine()]);
              }}
            >
              Add line
            </button>
          ) : null}
        </div>

        <div class="sales-lines-list">
          {lines.map((line, index) => {
            const summary = lineSummaries[index] ?? { net: 0, vat: 0, other: 0, total: 0 };

            return (
              <div class="sales-line-card" key={index}>
                <label class="sales-field">
                  <span>Product</span>
                  <select
                    value={line.productId}
                    disabled={isReadOnly}
                    onChange={(event) => {
                      setAllowAutoUnitPrice(true);
                      const productId = (event.currentTarget as HTMLSelectElement).value;
                      setLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, productId } : item,
                        ),
                      );
                    }}
                  >
                    <option value="">Select product</option>
                    {options.products.map((product) => (
                      <option key={product.productId} value={String(product.productId)}>
                        {product.productName}
                      </option>
                    ))}
                  </select>
                </label>

                <div class="sales-line-grid">
                  <label class="sales-field">
                    <span>Qty</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={line.orderQty}
                      disabled={isReadOnly}
                      onInput={(event) =>
                        setLines((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  orderQty: (event.currentTarget as HTMLInputElement).value,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    {lineOnHand[index] != null ? (
                      <span class="sales-hint">On hand: {lineOnHand[index]} {line.orderUnit}</span>
                    ) : null}
                  </label>

                  <label class="sales-field">
                    <span>Unit</span>
                    <input
                      type="text"
                      value={line.orderUnit}
                      disabled={isReadOnly}
                      onInput={(event) =>
                        setLines((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  orderUnit: (event.currentTarget as HTMLInputElement).value,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>

                  <label class="sales-field">
                    <span>Unit price (ex VAT)</span>
                    <input type="text" value={line.unitPrice} readOnly disabled={isReadOnly} />
                    {linePriceErrors[index] ? (
                      <span class="sales-hint sales-hint-warn">{linePriceErrors[index]}</span>
                    ) : null}
                  </label>

                  <label class="sales-field">
                    <span>Line total</span>
                    <input type="text" value={summary.total.toFixed(2)} readOnly disabled />
                  </label>
                </div>

                {!isReadOnly && lines.length > 1 ? (
                  <button
                    type="button"
                    class="sales-btn-link"
                    onClick={() =>
                      setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    Remove line
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div class="sales-totals-row">
          <div>VAT: {totalsPreview.vat.toFixed(2)} XAF</div>
          <div>Sales tax: {totalsPreview.other.toFixed(2)} XAF</div>
          <div>
            <strong>Total: {totalsPreview.total.toFixed(2)} XAF</strong>
          </div>
        </div>
      </div>

      <div class="sales-panel sales-payments-panel">
        <div class="sales-section-header">
          <div>
            <h3>3 · Payments</h3>
            <p class="sales-muted">Optional advance or instalment payments.</p>
          </div>
          {!isReadOnly ? (
            <button
              type="button"
              class="sales-btn-secondary"
              onClick={() => setPayments((current) => [...current, emptyPayment()])}
            >
              Add payment
            </button>
          ) : null}
        </div>

        {payments.length === 0 ? (
          <p class="sales-muted">No payments on this order yet.</p>
        ) : (
          <div class="sales-payments-form">
            {payments.map((payment, index) => {
              const method = paymentMethods.find((item) => item.id === payment.paymentMethodId);
              const isCheque = method?.kind === "CHEQUE";

              return (
                <div class="sales-payment-row" key={index}>
                  <label class="sales-field">
                    <span>Method</span>
                    <select
                      value={payment.paymentMethodId}
                      disabled={isReadOnly}
                      onChange={(event) =>
                        setPayments((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  paymentMethodId: (event.currentTarget as HTMLSelectElement)
                                    .value,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {paymentMethods.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label class="sales-field">
                    <span>Date</span>
                    <input
                      type="date"
                      value={payment.paymentDate}
                      min={postingPeriod?.startDate}
                      max={postingPeriod?.endDate}
                      disabled={isReadOnly || !postingPeriod}
                      onInput={(event) =>
                        setPayments((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  paymentDate: (event.currentTarget as HTMLInputElement).value,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>

                  {isCheque ? (
                    <>
                      <label class="sales-field">
                        <span>Cheque no.</span>
                        <input
                          type="text"
                          value={payment.chequeNo}
                          disabled={isReadOnly}
                          onInput={(event) =>
                            setPayments((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      chequeNo: (event.currentTarget as HTMLInputElement).value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label class="sales-field">
                        <span>Bank</span>
                        <input
                          type="text"
                          value={payment.bank}
                          disabled={isReadOnly}
                          onInput={(event) =>
                            setPayments((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      bank: (event.currentTarget as HTMLInputElement).value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <label class="sales-field">
                      <span>CDC receipt no.</span>
                      <input
                        type="text"
                        value={payment.cashReceiptNo}
                        disabled={isReadOnly}
                        onInput={(event) =>
                          setPayments((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    cashReceiptNo: (event.currentTarget as HTMLInputElement).value,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  )}

                  {!isReadOnly ? (
                    <button
                      type="button"
                      class="sales-btn-link"
                      onClick={() =>
                        setPayments((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div class="sales-actions-row">
        {!isReadOnly ? (
          <button
            type="button"
            class="sales-btn-primary"
            disabled={!canSave}
            onClick={() => void saveOrder()}
          >
            {busy === "save"
              ? "Saving…"
              : orderId != null
                ? "Update delivery order"
                : "Save delivery order"}
          </button>
        ) : null}

        {orderId != null && docStatus === "PENDING" && canValidate ? (
          <button
            type="button"
            class="sales-btn-secondary"
            disabled={busy !== null}
            onClick={() => void validateOrder()}
          >
            {busy === "validate" ? "Validating…" : "Validate"}
          </button>
        ) : null}

        {orderId != null && docStatus === "PENDING" && !isReadOnly ? (
          <button
            type="button"
            class="sales-btn-danger"
            disabled={busy !== null}
            onClick={() => void deleteOrder()}
          >
            Delete order
          </button>
        ) : null}
      </div>
    </div>
  );
}
