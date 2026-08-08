import { useEffect, useMemo, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import { getElectronApi } from "../auth/client.ts";
import { getAuthenticatedFinancialYears } from "../auth/financialYears.ts";
import type { AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import { canPerformActionFromSnapshot } from "../../shared/permissionUtils.ts";
import type { OpenPostingPeriod } from "../../shared/financialYears.types.ts";
import {
  FALLBACK_TAX_RATES,
  resolveCustomerTaxProfile,
  type TaxRatesBag,
} from "../../shared/taxRules.ts";
import { isValidBookletSerial } from "../../shared/bookletSerial.ts";
import { SalePrintView } from "./SalePrintView.tsx";
import { SalesLineModal, type SalesLineDraft } from "./SalesLineModal.tsx";
import type {
  AvailableDeliveryOrderRow,
  DeliveryOrderLookupResult,
  LoadedSaleView,
  PendingSaleRow,
  SaleDisposition,
  SaleProductMode,
  SalesFormOptions,
  SalesPaymentMethodOption,
  SalesProductOption,
  StorageLocationOption,
} from "./types.ts";
import "./sales.css";

interface SalesClientProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  onOpenList: () => void;
  initialInvoiceNo?: string;
}

type PaymentDraft = {
  paymentMethodId: string;
  amount: string;
  chequeNo?: string;
  bank?: string;
};

function parseDec(value: string): number {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampDateToPeriod(isoDate: string, period: OpenPostingPeriod | null): string {
  if (!period) return isoDate;
  if (isoDate < period.startDate) return period.startDate;
  if (isoDate > period.endDate) return period.endDate;
  return isoDate;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultPaymentMethodId(methods: SalesPaymentMethodOption[]): string {
  return (
    methods.find((method) => method.code === "CASH")?.id ?? methods[0]?.id ?? ""
  );
}

function statusClass(status: LoadedSaleView["status"]): string {
  if (status === "VALIDATED") {
    return "sales-status sales-status-validated";
  }
  if (status === "REJECTED") {
    return "sales-status sales-status-rejected";
  }
  return "sales-status sales-status-pending";
}

function defaultStorageLocationId(
  options: SalesFormOptions,
  salesPointId: string,
  isBottleMode: boolean,
): string {
  if (isBottleMode && options.bottleOilStoreLocationId != null) {
    return String(options.bottleOilStoreLocationId);
  }

  const spId = Number.parseInt(salesPointId, 10);
  const defaultLocation =
    options.storageLocations.find(
      (location) => location.salesPointId === spId && location.isDefault,
    ) ??
    options.storageLocations.find((location) => location.salesPointId === spId);

  return defaultLocation ? String(defaultLocation.id) : "";
}

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getProductLabel(
  productId: string,
  products: SalesProductOption[],
): string {
  const product = products.find((item) => String(item.productId) === productId);
  return product ? `${product.productName} (${product.productCat})` : "—";
}

function getLocationLabel(
  storageLocationId: string,
  locations: StorageLocationOption[],
): string {
  const location = locations.find(
    (item) => String(item.id) === storageLocationId,
  );
  return location?.name ?? "—";
}

function getLineQuantity(line: SalesLineDraft, isBottleMode: boolean): string {
  return isBottleMode ? line.qtyUnits : line.qtyKg;
}

function getLineUnitPrice(
  line: SalesLineDraft,
  isBottleMode: boolean,
  isSpecialDisposition: boolean,
): string {
  if (isSpecialDisposition) {
    return "0";
  }

  return isBottleMode ? line.unitPricePerUnit : line.unitPricePerKg;
}

function getLineSubtotal(
  line: SalesLineDraft,
  isBottleMode: boolean,
  isSpecialDisposition: boolean,
): number {
  if (isSpecialDisposition) {
    return 0;
  }

  return Math.round(
    parseDec(getLineQuantity(line, isBottleMode)) *
      parseDec(getLineUnitPrice(line, isBottleMode, isSpecialDisposition)),
  );
}

function emptyLine(
  options: SalesFormOptions,
  salesPointId: string,
  isBottleMode: boolean,
): SalesLineDraft {
  const products = isBottleMode
    ? options.bottledProducts
    : options.looseProducts;

  return {
    productId: String(products[0]?.productId ?? ""),
    qtyKg: "0",
    qtyUnits: "0",
    unitPricePerKg: "0",
    unitPricePerUnit: "0",
    storageLocationId: defaultStorageLocationId(
      options,
      salesPointId,
      isBottleMode,
    ),
  };
}

export function SalesClient({
  user,
  permissions,
  onOpenList,
  initialInvoiceNo = "",
}: SalesClientProps) {
  const canValidate = canPerformActionFromSnapshot(
    permissions,
    "validate_sales",
  );
  const [options, setOptions] = useState<SalesFormOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [saleId, setSaleId] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleStatus, setSaleStatus] = useState<LoadedSaleView["status"] | null>(
    null,
  );
  const [validatedByName, setValidatedByName] = useState("");
  const [lookupNo, setLookupNo] = useState(initialInvoiceNo);
  const [pendingSales, setPendingSales] = useState<PendingSaleRow[]>([]);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [invoiceCustomerName, setInvoiceCustomerName] = useState("");
  const [useRegisteredCustomer, setUseRegisteredCustomer] = useState(true);
  const [salesPointId, setSalesPointId] = useState("");
  const [saleProductMode, setSaleProductMode] =
    useState<SaleProductMode>("LOOSE");
  const [saleDisposition, setSaleDisposition] =
    useState<SaleDisposition>("NORMAL");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [deliveryOrderNo, setDeliveryOrderNo] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(todayIsoDate());
  const [postingPeriod, setPostingPeriod] = useState<OpenPostingPeriod | null>(null);
  const [taxRates, setTaxRates] = useState<TaxRatesBag>(FALLBACK_TAX_RATES);
  const [lines, setLines] = useState<SalesLineDraft[]>([]);
  const [payments, setPayments] = useState<PaymentDraft[]>([
    { paymentMethodId: "", amount: "0" },
  ]);

  const [availableDos, setAvailableDos] = useState<AvailableDeliveryOrderRow[]>(
    [],
  );
  const [doLookup, setDoLookup] = useState<DeliveryOrderLookupResult | null>(
    null,
  );
  const [doPickerOpen, setDoPickerOpen] = useState(false);
  const [lineModal, setLineModal] = useState<{
    mode: "add" | "edit";
    index: number | null;
    line: SalesLineDraft;
  } | null>(null);

  const isReadOnly = saleId != null;
  const isAtBota =
    options?.botaSalesPointId != null &&
    salesPointId === String(options.botaSalesPointId);
  const isBottleMode = isAtBota && saleProductMode === "BOTTLE";
  const isSpecialDisposition =
    saleDisposition === "RATION" || saleDisposition === "PUBLIC_RELATION";
  const isInvoiceOnlyCustomer = isSpecialDisposition || !useRegisteredCustomer;
  const activeProducts = isBottleMode
    ? (options?.bottledProducts ?? [])
    : (options?.looseProducts ?? []);
  const salesPointLocations = locationsForSalesPoint(salesPointId);
  const catalogProducts = useMemo(
    () => [
      ...(options?.looseProducts ?? []),
      ...(options?.bottledProducts ?? []),
    ],
    [options],
  );
  const itemsSubtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + getLineSubtotal(line, isBottleMode, isSpecialDisposition),
        0,
      ),
    [lines, isBottleMode, isSpecialDisposition],
  );

  const customer = !isInvoiceOnlyCustomer
    ? options?.customers.find((item) => String(item.id) === customerId)
    : undefined;
  const skipTax = isBottleMode || isSpecialDisposition;
  const taxProfile =
    !skipTax && customer
      ? resolveCustomerTaxProfile({
          residency: customer.residency,
          taxRegimeKind: customer.taxRegimeKind,
          taxpayerId: customer.taxpayerId,
          salesTaxExempt: customer.salesTaxExempt,
          rates: taxRates,
        })
      : null;
  const vatRate = taxProfile?.vatApplies ? taxProfile.vatRate : 0;
  const salesTaxRate = taxProfile?.salesTaxRate ?? 0;

  const totals = useMemo(() => {
    if (isSpecialDisposition) {
      return { net: 0, vat: 0, salesTax: 0, gross: 0, paid: 0 };
    }

    if (isBottleMode) {
      const gross = Math.round(
        lines.reduce(
          (sum, line) =>
            sum + parseDec(line.qtyUnits) * parseDec(line.unitPricePerUnit),
          0,
        ),
      );
      const paid = Math.round(
        payments.reduce((sum, payment) => sum + parseDec(payment.amount), 0),
      );
      return { net: gross, vat: 0, salesTax: 0, gross, paid };
    }

    const net = Math.round(
      lines.reduce(
        (sum, line) =>
          sum + parseDec(line.qtyKg) * parseDec(line.unitPricePerKg),
        0,
      ),
    );
    const vat = Math.round(net * vatRate);
    const salesTax = Math.round(net * salesTaxRate);
    const gross = net + vat + salesTax;
    const paid = Math.round(
      payments.reduce((sum, payment) => sum + parseDec(payment.amount), 0),
    );
    return { net, vat, salesTax, gross, paid };
  }, [
    lines,
    payments,
    vatRate,
    salesTaxRate,
    isBottleMode,
    isSpecialDisposition,
  ]);

  useEffect(() => {
    let cancelled = false;
    void getElectronApi()
      .sales.getTaxRatesAsOf(transactionDate)
      .then((rates) => {
        if (!cancelled) {
          setTaxRates(rates);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTaxRates(FALLBACK_TAX_RATES);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [transactionDate]);

  useEffect(() => {
    if (isReadOnly || isSpecialDisposition) {
      return;
    }

    setPayments((current) => {
      if (current.length === 0) {
        return current;
      }

      const next = [...current];
      next[0] = { ...next[0], amount: String(totals.gross) };
      return next;
    });
  }, [totals.gross, isReadOnly, isSpecialDisposition]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [formOptions, pending, period] = await Promise.all([
          getElectronApi().sales.getFormOptions(),
          getElectronApi().sales.listPendingSales(),
          getAuthenticatedFinancialYears().getOpenPostingPeriod(),
        ]);
        setOptions(formOptions);
        setPendingSales(pending);
        setPostingPeriod(period);
        setTransactionDate((current) => clampDateToPeriod(current, period));

        const hasCustomers = formOptions.customers.length > 0;
        const firstCustomer = hasCustomers
          ? String(formOptions.customers[0].id)
          : "";
        const firstSalesPoint = String(formOptions.salesPoints[0]?.id ?? "");
        const payId = defaultPaymentMethodId(formOptions.paymentMethods);

        setUseRegisteredCustomer(hasCustomers);
        setCustomerId(firstCustomer);
        setInvoiceCustomerName("");
        setSalesPointId(firstSalesPoint);
        setLines([]);
        setPayments([{ paymentMethodId: payId, amount: "0" }]);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load sales options.",
        );
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (initialInvoiceNo.trim()) {
      void loadSale(initialInvoiceNo.trim());
    }
  }, [initialInvoiceNo]);

  useEffect(() => {
    if (
      !options ||
      isReadOnly ||
      isBottleMode ||
      isSpecialDisposition ||
      !useRegisteredCustomer
    ) {
      setAvailableDos([]);
      setDoPickerOpen(false);
      return;
    }

    const spId = Number.parseInt(salesPointId, 10);
    const custId = Number.parseInt(customerId, 10);
    if (!Number.isFinite(spId) || !Number.isFinite(custId)) {
      setAvailableDos([]);
      setDoPickerOpen(false);
      return;
    }

    let cancelled = false;

    getElectronApi()
      .sales.listAvailableDeliveryOrders({
        salesPointId: spId,
        customerId: custId,
      })
      .then((rows) => {
        if (!cancelled) {
          setAvailableDos(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableDos([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    options,
    salesPointId,
    customerId,
    isBottleMode,
    isSpecialDisposition,
    isReadOnly,
    useRegisteredCustomer,
  ]);

  useEffect(() => {
    if (!options || isReadOnly) {
      return;
    }

    if (saleDisposition === "RATION" || saleDisposition === "PUBLIC_RELATION") {
      setUseRegisteredCustomer(false);
      setCustomerId("");
      setDeliveryOrderNo("");
      setDoLookup(null);
    }
  }, [saleDisposition, options, isReadOnly]);

  useEffect(() => {
    if (!options || isReadOnly) {
      return;
    }

    if (!isAtBota && saleProductMode === "BOTTLE") {
      setSaleProductMode("LOOSE");
    }
  }, [isAtBota, saleProductMode, options, isReadOnly]);

  useEffect(() => {
    if (!options || isReadOnly) {
      return;
    }

    setLines((current) =>
      current.map((line) => ({
        ...line,
        storageLocationId: defaultStorageLocationId(
          options,
          salesPointId,
          isBottleMode,
        ),
        productId: activeProducts.some(
          (product) => String(product.productId) === line.productId,
        )
          ? line.productId
          : String(activeProducts[0]?.productId ?? ""),
      })),
    );
  }, [isBottleMode, salesPointId, options, isReadOnly, activeProducts.length]);

  function resetNew() {
    if (!options) {
      return;
    }

    const hasCustomers = options.customers.length > 0;
    const firstCustomer = hasCustomers ? String(options.customers[0].id) : "";
    const firstSalesPoint = String(options.salesPoints[0]?.id ?? "");

    setSaleId(null);
    setInvoiceNo("");
    setSaleStatus(null);
    setValidatedByName("");
    setLookupNo("");
    setPrintOpen(false);
    setUseRegisteredCustomer(hasCustomers);
    setCustomerId(firstCustomer);
    setInvoiceCustomerName("");
    setSalesPointId(firstSalesPoint);
    setSaleProductMode("LOOSE");
    setSaleDisposition("NORMAL");
    setReferenceNumber("");
    setDeliveryOrderNo("");
    setVehicleNumber("");
    setTransactionDate(todayIsoDate());
    setLines([]);
    setPayments([
      {
        paymentMethodId: defaultPaymentMethodId(options.paymentMethods),
        amount: "0",
      },
    ]);
    setDoLookup(null);
    setDoPickerOpen(false);
    setLineModal(null);
    setBanner(null);
  }

  function openAddLineModal() {
    if (!options) {
      return;
    }

    setLineModal({
      mode: "add",
      index: null,
      line: emptyLine(options, salesPointId, isBottleMode),
    });
  }

  function openEditLineModal(index: number) {
    setLineModal({
      mode: "edit",
      index,
      line: lines[index],
    });
  }

  function saveLineModal(line: SalesLineDraft) {
    if (!lineModal) {
      return;
    }

    if (lineModal.mode === "add") {
      setLines((current) => [...current, line]);
    } else if (lineModal.index != null) {
      setLines((current) =>
        current.map((item, index) => (index === lineModal.index ? line : item)),
      );
    }

    setLineModal(null);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function loadSale(rawNo?: string) {
    const invoice = (rawNo ?? lookupNo).trim();
    if (!invoice) {
      return;
    }

    setBusy("load");
    setBanner(null);

    try {
      const sale = await getElectronApi().sales.loadSaleByInvoiceNo(invoice);
      if (!sale) {
        setBanner({ type: "error", text: "Invoice not found." });
        return;
      }

      setSaleId(sale.id);
      setInvoiceNo(sale.invoiceNo);
      setSaleStatus(sale.status);
      setValidatedByName(sale.validatedByName ?? "");
      setLookupNo(sale.invoiceNo);
      const registered = sale.customerId != null;
      setUseRegisteredCustomer(registered);
      setCustomerId(registered ? String(sale.customerId) : "");
      setInvoiceCustomerName(registered ? "" : sale.customerName);
      setSalesPointId(
        sale.salesPointId != null ? String(sale.salesPointId) : "",
      );
      setSaleProductMode(sale.saleProductMode ?? "LOOSE");
      setSaleDisposition(sale.saleDisposition ?? "NORMAL");
      setReferenceNumber(sale.referenceNumber ?? "");
      setDeliveryOrderNo(sale.deliveryOrderNo ?? "");
      setVehicleNumber(sale.vehicleNumber);
      setTransactionDate(sale.dateIssuedIso.slice(0, 10));
      setLines(
        sale.lines.map((line) => ({
          productId: String(line.productId),
          qtyKg: line.qtyKg,
          qtyUnits: line.qtyUnits ?? line.qtyKg,
          unitPricePerKg: line.unitPricePerKg,
          unitPricePerUnit: line.unitPricePerUnit ?? line.unitPricePerKg,
          storageLocationId: line.storageLocationId
            ? String(line.storageLocationId)
            : "",
        })),
      );
      setPayments(
        sale.payments.length > 0
          ? sale.payments.map((payment) => ({
              paymentMethodId: payment.paymentMethodId,
              amount: payment.amount,
              chequeNo: payment.chequeNo ?? "",
              bank: payment.bank ?? "",
            }))
          : [
              {
                paymentMethodId: defaultPaymentMethodId(
                  options?.paymentMethods ?? [],
                ),
                amount: "0",
              },
            ],
      );
      setDoLookup(null);
      setLineModal(null);
    } catch (error) {
      setBanner({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to load invoice.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function lookupDo() {
    const trimmed = deliveryOrderNo.trim();
    const spId = Number.parseInt(salesPointId, 10);

    if (!trimmed || !Number.isFinite(spId)) {
      setBanner({ type: "error", text: "Enter a delivery order number." });
      return;
    }

    setBusy("do-lookup");
    setBanner(null);

    try {
      const result = await getElectronApi().sales.lookupDeliveryOrder({
        deliveryOrderNo: trimmed,
        salesPointId: spId,
        customerId: Number.parseInt(customerId, 10),
      });

      if (!result) {
        setDoLookup(null);
        setBanner({ type: "error", text: "Delivery order not found." });
        return;
      }

      setDoLookup(result);
    } catch (error) {
      setBanner({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to lookup delivery order.",
      });
    } finally {
      setBusy(null);
    }
  }

  function applyDoLinesFrom(
    lookup: DeliveryOrderLookupResult,
    productId?: number,
  ) {
    if (!options) {
      return;
    }

    setUseRegisteredCustomer(true);
    setCustomerId(String(lookup.customerId));
    setInvoiceCustomerName("");
    setDeliveryOrderNo(lookup.deliveryOrderNo);

    const nextLines = lookup.perProduct
      .filter((row) => parseDec(row.balanceQty) > 0)
      .filter((row) =>
        productId == null ? true : row.productId === productId,
      )
      .map((row) => ({
        productId: String(row.productId),
        qtyKg: row.balanceQty,
        qtyUnits: "0",
        unitPricePerKg: row.unitPrice,
        unitPricePerUnit: row.unitPrice,
        storageLocationId: defaultStorageLocationId(
          options,
          salesPointId,
          false,
        ),
      }));

    if (nextLines.length === 0) {
      setBanner({
        type: "error",
        text:
          productId == null
            ? "No remaining balance on this delivery order."
            : "No remaining balance for that product on this delivery order.",
      });
      return;
    }

    setLines(nextLines);
    setBanner({
      type: "ok",
      text: `Loaded ${nextLines.length} line(s) from ${lookup.deliveryOrderNo}.`,
    });
  }

  function applyDoLines() {
    if (!doLookup) {
      return;
    }
    applyDoLinesFrom(doLookup);
  }

  async function selectDeliveryOrder(doNo: string, productId: number) {
    const spId = Number.parseInt(salesPointId, 10);
    const custId = Number.parseInt(customerId, 10);

    setDoPickerOpen(false);
    setDeliveryOrderNo(doNo);
    setDoLookup(null);

    if (!Number.isFinite(spId) || !Number.isFinite(custId)) {
      setBanner({
        type: "error",
        text: "Select a sales point and customer before picking a delivery order.",
      });
      return;
    }

    setBusy("do-lookup");
    setBanner(null);

    try {
      const result = await getElectronApi().sales.lookupDeliveryOrder({
        deliveryOrderNo: doNo,
        salesPointId: spId,
        customerId: custId,
      });

      if (!result) {
        setBanner({ type: "error", text: "Delivery order not found." });
        return;
      }

      setDoLookup(result);
      applyDoLinesFrom(result, productId);
    } catch (error) {
      setBanner({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load delivery order.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function saveSale() {
    if (!options) {
      return;
    }

    setBusy("save");
    setBanner(null);

    try {
      const filteredLines = lines
        .filter((line) => line.productId)
        .filter((line) =>
          isBottleMode ? parseDec(line.qtyUnits) > 0 : parseDec(line.qtyKg) > 0,
        );

      const result = await getElectronApi().sales.createSale({
        userId: user.id,
        invoiceNo,
        customerId: useRegisteredCustomer
          ? Number.parseInt(customerId, 10)
          : null,
        customerNameOverride: isInvoiceOnlyCustomer
          ? invoiceCustomerName.trim() || undefined
          : undefined,
        salesPointId: salesPointId ? Number.parseInt(salesPointId, 10) : null,
        vehicleNumber,
        dateIssued: transactionDate,
        referenceNumber: referenceNumber || undefined,
        deliveryOrderNo:
          !isBottleMode &&
          !isSpecialDisposition &&
          useRegisteredCustomer &&
          deliveryOrderNo.trim()
            ? deliveryOrderNo.trim()
            : undefined,
        saleProductMode: isAtBota ? saleProductMode : "LOOSE",
        saleDisposition,
        lines: filteredLines.map((line) => ({
          productId: Number.parseInt(line.productId, 10),
          qtyKg: line.qtyKg,
          qtyUnits: isBottleMode ? line.qtyUnits : undefined,
          unitPricePerKg: line.unitPricePerKg,
          unitPricePerUnit: isBottleMode ? line.unitPricePerUnit : undefined,
          storageLocationId: line.storageLocationId
            ? Number.parseInt(line.storageLocationId, 10)
            : null,
        })),
        payments: isSpecialDisposition
          ? []
          : payments
              .filter((payment) => parseDec(payment.amount) > 0)
              .map((payment) => ({
                paymentMethodId: payment.paymentMethodId,
                amount: payment.amount,
                chequeNo: payment.chequeNo,
                bank: payment.bank,
              })),
      });

      if (result.ok === false) {
        setBanner({ type: "error", text: result.error });
        return;
      }

      setBanner({
        type: "ok",
        text: `Sale saved as ${result.invoiceNo}.`,
      });
      setPendingSales(await getElectronApi().sales.listPendingSales());
      await loadSale(result.invoiceNo);
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save sale.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function validateLoadedSale() {
    if (!saleId) {
      return;
    }

    setBusy("validate");
    setBanner(null);

    try {
      const result = await getElectronApi().sales.validateSale({
        saleId,
        userId: user.id,
      });
      if (result.ok === false) {
        setBanner({ type: "error", text: result.error });
        return;
      }

      setBanner({ type: "ok", text: "Invoice validated." });
      await loadSale(invoiceNo);
      setPendingSales(await getElectronApi().sales.listPendingSales());
    } catch (error) {
      setBanner({
        type: "error",
        text:
          error instanceof Error ? error.message : "Failed to validate sale.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function deleteLoadedSale() {
    if (!saleId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete invoice ${invoiceNo || saleId}? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setBusy("delete");
    setBanner(null);

    try {
      const result = await getElectronApi().sales.deleteSale({
        saleId,
        userId: user.id,
      });
      if (result.ok === false) {
        setBanner({ type: "error", text: result.error });
        return;
      }

      setBanner({ type: "ok", text: "Invoice deleted." });
      resetNew();
      setPendingSales(await getElectronApi().sales.listPendingSales());
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to delete sale.",
      });
    } finally {
      setBusy(null);
    }
  }

  function locationsForSalesPoint(spId: string) {
    if (!options) {
      return [];
    }

    const id = Number.parseInt(spId, 10);
    return options.storageLocations.filter(
      (location) => location.salesPointId === id,
    );
  }

  if (loadError) {
    return <p class="sales-error">{loadError}</p>;
  }

  if (!options) {
    return <p class="sales-muted">Loading sales screen…</p>;
  }

  const setupRequired =
    (options.looseProducts.length === 0 &&
      options.bottledProducts.length === 0) ||
    options.paymentMethods.length === 0;

  const vehicleRequired = !isBottleMode && !isSpecialDisposition;
  const showDeliveryOrders =
    !isBottleMode && !isSpecialDisposition && useRegisteredCustomer;
  const showPayments = !isSpecialDisposition;
  const hasCustomer = isSpecialDisposition
    ? invoiceCustomerName.trim().length > 0
    : useRegisteredCustomer
      ? customerId.trim().length > 0
      : invoiceCustomerName.trim().length > 0;
  const canSave =
    busy === null &&
    hasCustomer &&
    isValidBookletSerial(invoiceNo) &&
    (!vehicleRequired || vehicleNumber.trim()) &&
    (isSpecialDisposition || totals.paid === totals.gross);

  if (setupRequired) {
    return (
      <div class="sales-setup">
        <h3>Setup required</h3>
        <ul>
          {options.looseProducts.length === 0 &&
          options.bottledProducts.length === 0 ? (
            <li>Add at least one product.</li>
          ) : null}
          {options.paymentMethods.length === 0 ? (
            <li>Activate at least one payment method.</li>
          ) : null}
        </ul>
        <p class="sales-muted">
          Run database reset or apply migrations 003–005 to load demo POS data.
        </p>
      </div>
    );
  }

  return (
    <div class="sales-client">
      {printOpen && saleId ? (
        <SalePrintView saleId={saleId} onClose={() => setPrintOpen(false)} />
      ) : null}

      {banner ? (
        <div class={`sales-banner sales-banner-${banner.type}`}>
          {banner.text}
        </div>
      ) : null}

      <div class="sales-panel">
        <div class="sales-panel-header">
          <div>
            <h3>Open existing invoice</h3>
            <p class="sales-muted">
              Enter the invoice number to load the full document, or pick a
              pending invoice.
            </p>
          </div>
          <button
            type="button"
            class="sales-btn-secondary"
            onClick={onOpenList}
          >
            View all invoices
          </button>
        </div>

        <div class="sales-lookup-row">
          <label class="sales-field sales-field-grow">
            <span>Invoice no.</span>
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
              {pendingSales.length > 0 ? (
                <button
                  type="button"
                  class="sales-pending-toggle"
                  onClick={() => setPendingOpen((open) => !open)}
                >
                  {pendingSales.length} pending {pendingOpen ? "▴" : "▾"}
                </button>
              ) : null}
            </div>
            {pendingOpen ? (
              <ul class="sales-pending-list">
                {pendingSales.map((pending) => (
                  <li key={pending.invoiceNo}>
                    <button
                      type="button"
                      onClick={() => {
                        setLookupNo(pending.invoiceNo);
                        setPendingOpen(false);
                        void loadSale(pending.invoiceNo);
                      }}
                    >
                      <strong>{pending.invoiceNo}</strong>
                      <span>
                        {pending.customerName} · {formatDisplayDate(pending.soldAtIso)}
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
            onClick={() => void loadSale()}
          >
            {busy === "load" ? "Loading…" : "Load"}
          </button>
          <button type="button" class="sales-btn-secondary" onClick={resetNew}>
            New sale
          </button>
        </div>
      </div>

      <section class="sales-panel">
        <div class="sales-invoice-header">
          <div>
            <h2>Invoice details</h2>
            <p class="sales-muted">
              Status{" "}
              {saleStatus ? (
                <span class={statusClass(saleStatus)}>{saleStatus}</span>
              ) : (
                "—"
              )}
              {validatedByName ? ` · validated by ${validatedByName}` : ""}
              {saleProductMode === "BOTTLE" ? " · Bottle mode" : ""}
              {saleDisposition !== "NORMAL"
                ? ` · ${saleDisposition.replace("_", " ")}`
                : ""}
            </p>
          </div>
          {saleId ? (
            <div class="sales-invoice-no">{invoiceNo}</div>
          ) : (
            <label class="sales-field sales-invoice-no-field">
              <span>Booklet serial no.</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\\d*"
                value={invoiceNo}
                placeholder="12345"
                onInput={(event) =>
                  setInvoiceNo((event.currentTarget as HTMLInputElement).value)
                }
              />
            </label>
          )}
        </div>

        <div class="sales-invoice-form">
          <div class="sales-invoice-grid">
            <div class="sales-invoice-options sales-field-span-full">
              <fieldset class="sales-checkbox-group" disabled={isReadOnly}>
                <legend>Disposition</legend>
                <label class="sales-checkbox">
                  <input
                    type="checkbox"
                    checked={saleDisposition === "RATION"}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setSaleDisposition(
                        (event.currentTarget as HTMLInputElement).checked
                          ? "RATION"
                          : "NORMAL",
                      )
                    }
                  />
                  Ration
                </label>
                <label class="sales-checkbox">
                  <input
                    type="checkbox"
                    checked={saleDisposition === "PUBLIC_RELATION"}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setSaleDisposition(
                        (event.currentTarget as HTMLInputElement).checked
                          ? "PUBLIC_RELATION"
                          : "NORMAL",
                      )
                    }
                  />
                  Public relation
                </label>
              </fieldset>

              {isAtBota ? (
                <fieldset class="sales-checkbox-group" disabled={isReadOnly}>
                  <legend>Product mode (BOTA)</legend>
                  <label class="sales-checkbox">
                    <input
                      type="checkbox"
                      checked={saleProductMode === "BOTTLE"}
                      disabled={isReadOnly}
                      onChange={(event) =>
                        setSaleProductMode(
                          (event.currentTarget as HTMLInputElement).checked
                            ? "BOTTLE"
                            : "LOOSE",
                        )
                      }
                    />
                    Bottle (units)
                  </label>
                  <span class="sales-muted sales-checkbox-hint">
                    {saleProductMode === "BOTTLE"
                      ? "Tax-inclusive pricing"
                      : "Loose (kg)"}
                  </span>
                </fieldset>
              ) : null}
            </div>

            <label class="sales-field">
              <span>Sale date</span>
              <input
                type="date"
                value={transactionDate}
                min={postingPeriod?.startDate}
                max={postingPeriod?.endDate}
                disabled={isReadOnly || !postingPeriod}
                onInput={(event) =>
                  setTransactionDate(
                    (event.currentTarget as HTMLInputElement).value,
                  )
                }
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
              <span>Sales point</span>
              <select
                value={salesPointId}
                disabled={isReadOnly}
                onChange={(event) => {
                  const next = (event.currentTarget as HTMLSelectElement).value;
                  setSalesPointId(next);
                  setDoLookup(null);
                }}
              >
                {options.salesPoints.map((point) => (
                  <option key={point.id} value={String(point.id)}>
                    {point.name}
                  </option>
                ))}
              </select>
            </label>

            <label class="sales-field">
              <span>Reference no. (optional)</span>
              <input
                type="text"
                value={referenceNumber}
                disabled={isReadOnly}
                onInput={(event) =>
                  setReferenceNumber(
                    (event.currentTarget as HTMLInputElement).value,
                  )
                }
              />
            </label>

            {!isReadOnly &&
            !isSpecialDisposition &&
            options.customers.length > 0 ? (
              <label class="sales-field sales-field-span-full">
                <span class="sales-checkbox-inline">
                  <input
                    type="checkbox"
                    checked={useRegisteredCustomer}
                    onChange={(event) => {
                      const checked = (event.currentTarget as HTMLInputElement)
                        .checked;
                      setUseRegisteredCustomer(checked);
                      if (checked) {
                        setCustomerId(
                          options.customers[0]?.id != null
                            ? String(options.customers[0].id)
                            : "",
                        );
                        setInvoiceCustomerName("");
                      } else {
                        setCustomerId("");
                        setInvoiceCustomerName("");
                        setDeliveryOrderNo("");
                        setDoLookup(null);
                      }
                    }}
                  />
                  Registered customer (from directory)
                </span>
              </label>
            ) : null}

            <label
              class={`sales-field${vehicleRequired ? " sales-field-span-2" : " sales-field-span-full"}`}
            >
              <span>Customer</span>
              {isInvoiceOnlyCustomer ? (
                <>
                  <input
                    type="text"
                    value={invoiceCustomerName}
                    disabled={isReadOnly}
                    placeholder="Customer name on invoice"
                    onInput={(event) =>
                      setInvoiceCustomerName(
                        (event.currentTarget as HTMLInputElement).value,
                      )
                    }
                  />
                  <span class="sales-hint">
                    Invoice-only customer · VAT exempt
                  </span>
                </>
              ) : (
                <>
                  <select
                    value={customerId}
                    disabled={isReadOnly}
                    onChange={(event) =>
                      setCustomerId(
                        (event.currentTarget as HTMLSelectElement).value,
                      )
                    }
                  >
                    {options.customers.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <span class="sales-hint">
                    Regime: {customer?.taxRegimeName ?? "—"}
                    {!skipTax && taxProfile?.vatApplies
                      ? " · VAT applies"
                      : " · VAT exempt"}
                    {!skipTax && taxProfile
                      ? ` · Sales tax ${(taxProfile.salesTaxRate * 100).toFixed(0)}%`
                      : ""}
                  </span>
                </>
              )}
            </label>

            {vehicleRequired ? (
              <label class="sales-field">
                <span>Vehicle number</span>
                <input
                  type="text"
                  value={vehicleNumber}
                  disabled={isReadOnly}
                  onInput={(event) =>
                    setVehicleNumber(
                      (event.currentTarget as HTMLInputElement).value,
                    )
                  }
                />
              </label>
            ) : null}
            {showDeliveryOrders ? (
              <label class="sales-field sales-field-span-full">
                <span>Delivery order no. (optional)</span>
                <div class="sales-do-row">
                  <input
                    type="text"
                    value={deliveryOrderNo}
                    disabled={isReadOnly}
                    placeholder="DO-2026-000001"
                    onInput={(event) => {
                      setDeliveryOrderNo(
                        (event.currentTarget as HTMLInputElement).value,
                      );
                      setDoLookup(null);
                    }}
                  />
                  {!isReadOnly ? (
                    <>
                      <button
                        type="button"
                        class="sales-btn-secondary sales-do-btn"
                        disabled={busy !== null || !deliveryOrderNo.trim()}
                        onClick={() => void lookupDo()}
                      >
                        {busy === "do-lookup" ? "…" : "Lookup"}
                      </button>
                      {availableDos.length > 0 ? (
                        <button
                          type="button"
                          class="sales-btn-secondary sales-do-btn"
                          disabled={busy !== null}
                          onClick={() => setDoPickerOpen((open) => !open)}
                        >
                          Pick DO {doPickerOpen ? "▴" : "▾"}
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
                {doPickerOpen && availableDos.length > 0 ? (
                  <ul class="sales-do-picker">
                    {availableDos.map((row) => (
                      <li key={`${row.deliveryOrderNo}:${row.productId}`}>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            void selectDeliveryOrder(
                              row.deliveryOrderNo,
                              row.productId,
                            )
                          }
                        >
                          <strong>
                            {row.isCarryForward ? "CF · " : ""}
                            {row.deliveryOrderNo}
                          </strong>
                          <span>
                            {row.productName} · {formatDisplayDate(row.dateIssued)} ·{" "}
                            {row.balanceKg} kg left
                            {row.isCarryForward ? " · carry-forward" : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </label>
            ) : null}
          </div>
        </div>

        {doLookup && !isReadOnly ? (
          <div class="sales-do-panel">
            <div class="sales-do-panel-header">
              <div>
                <strong>{doLookup.deliveryOrderNo}</strong>
                <span class="sales-muted">
                  {" "}
                  · {doLookup.customerName} · balance {doLookup.balanceKg} kg
                </span>
              </div>
              <button
                type="button"
                class="sales-btn-primary"
                onClick={applyDoLines}
              >
                Load lines from DO
              </button>
            </div>
            {!doLookup.customerMatches ? (
              <p class="sales-hint sales-do-warning">
                Selected customer does not match this delivery order. Loading
                lines will switch the customer.
              </p>
            ) : null}
            <table class="sales-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Ordered</th>
                  <th>Sold</th>
                  <th>Balance</th>
                  <th>Unit price</th>
                </tr>
              </thead>
              <tbody>
                {doLookup.perProduct.map((row) => (
                  <tr key={row.productId}>
                    <td>{row.productName}</td>
                    <td>{row.orderQty}</td>
                    <td>{row.soldQty}</td>
                    <td>{row.balanceQty}</td>
                    <td>{row.unitPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section class="sales-panel sales-items-panel">
        <div class="sales-section-header">
          <div>
            <h3>Items</h3>
            <p class="sales-muted">
              {lines.length} line{lines.length === 1 ? "" : "s"} ·{" "}
              {formatAmount(itemsSubtotal)} XAF subtotal
            </p>
          </div>
          {!isReadOnly ? (
            <button
              type="button"
              class="sales-btn-secondary"
              onClick={openAddLineModal}
            >
              Add line
            </button>
          ) : null}
        </div>

        <div class="sales-table-wrap sales-items-table-wrap">
          <table class="sales-table sales-items-table">
            <thead>
              <tr>
                <th class="sales-items-col-no">#</th>
                <th>Product</th>
                {!isBottleMode ? <th>Location</th> : null}
                <th class="sales-num">
                  {isBottleMode ? "Qty (units)" : "Qty (kg)"}
                </th>
                <th class="sales-num">
                  {isBottleMode ? "Price / unit" : "Price / kg"}
                </th>
                <th class="sales-num">Amount (XAF)</th>
                {!isReadOnly ? (
                  <th class="sales-items-col-actions">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      isBottleMode ? (isReadOnly ? 5 : 6) : isReadOnly ? 6 : 7
                    }
                    class="sales-items-empty"
                  >
                    <strong>No items yet</strong>
                    <span>
                      {isReadOnly
                        ? "This invoice has no line items."
                        : "Use Add line to enter products for this sale."}
                    </span>
                    {!isReadOnly ? (
                      <button
                        type="button"
                        class="sales-btn-primary"
                        onClick={openAddLineModal}
                      >
                        Add first item
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => {
                  const subtotal = getLineSubtotal(
                    line,
                    isBottleMode,
                    isSpecialDisposition,
                  );

                  return (
                    <tr key={`${line.productId}-${index}`}>
                      <td class="sales-items-col-no">{index + 1}</td>
                      <td>
                        <span class="sales-items-product">
                          {getProductLabel(line.productId, catalogProducts)}
                        </span>
                      </td>
                      {!isBottleMode ? (
                        <td>
                          {getLocationLabel(
                            line.storageLocationId,
                            salesPointLocations,
                          )}
                        </td>
                      ) : null}
                      <td class="sales-num">
                        {getLineQuantity(line, isBottleMode)}
                      </td>
                      <td class="sales-num">
                        {formatAmount(
                          parseDec(
                            getLineUnitPrice(
                              line,
                              isBottleMode,
                              isSpecialDisposition,
                            ),
                          ),
                        )}
                      </td>
                      <td class="sales-num sales-strong">
                        {formatAmount(subtotal)}
                      </td>
                      {!isReadOnly ? (
                        <td class="sales-items-col-actions">
                          <div class="sales-items-actions">
                            <button
                              type="button"
                              class="sales-link-btn"
                              onClick={() => openEditLineModal(index)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              class="sales-link-btn sales-link-btn-danger"
                              onClick={() => removeLine(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
            {lines.length > 0 ? (
              <tfoot>
                <tr>
                  <td
                    colSpan={
                      (isBottleMode
                        ? isReadOnly
                          ? 5
                          : 6
                        : isReadOnly
                          ? 6
                          : 7) - 1
                    }
                  >
                    {lines.length} item{lines.length === 1 ? "" : "s"}
                  </td>
                  <td class="sales-num sales-strong">
                    {formatAmount(itemsSubtotal)} XAF
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        <hr />
        <section class="sales-panel sales-totals">
          <p>Invoice Summary</p>
          <div class="sales-totals-row">
            <span>{isBottleMode ? "Total (tax inclusive)" : "Net"}</span>
            <span>{formatAmount(totals.net)} XAF</span>
          </div>
          {!isBottleMode && !isSpecialDisposition ? (
            <>
              <div class="sales-totals-row">
                <span>VAT</span>
                <span>{formatAmount(totals.vat)} XAF</span>
              </div>
              <div class="sales-totals-row">
                <span>Sales tax</span>
                <span>{formatAmount(totals.salesTax)} XAF</span>
              </div>
            </>
          ) : null}
          <div class="sales-totals-row sales-totals-strong">
            <span>Total</span>
            <span>{formatAmount(totals.gross)} XAF</span>
          </div>
          {showPayments ? (
            <>
              <div class="sales-totals-row">
                <span>Paid</span>
                <span>{formatAmount(totals.paid)} XAF</span>
              </div>
              <p class="sales-hint">No credit sales: paid must equal total.</p>
            </>
          ) : (
            <p class="sales-hint">
              Ration and public relation sales have zero amounts.
            </p>
          )}
        </section>
      </section>

      {showPayments ? (
        <section class="sales-panel sales-payments-panel">
          <div class="sales-section-header">
            <div>
              <h3>Payments</h3>
              <p class="sales-muted">
                {payments.length} payment{payments.length === 1 ? "" : "s"} ·{" "}
                {formatAmount(totals.paid)} XAF paid
              </p>
            </div>
            {!isReadOnly ? (
              <button
                type="button"
                class="sales-btn-secondary"
                onClick={() =>
                  setPayments((current) => [
                    ...current,
                    {
                      paymentMethodId: defaultPaymentMethodId(
                        options.paymentMethods,
                      ),
                      amount: "0",
                    },
                  ])
                }
              >
                Add payment line
              </button>
            ) : null}
          </div>

          <div class="sales-payments-form">
            {payments.map((payment, index) => {
              const method = options.paymentMethods.find(
                (item) => item.id === payment.paymentMethodId,
              );
              const isCheque = method?.kind === "CHEQUE";

              return (
                <div class="sales-payment-row" key={index}>
                  <div class="sales-payment-grid">
                    <label class="sales-field">
                      <span>Method</span>
                      {isReadOnly ? (
                        <div class="sales-payment-value">
                          {method?.name ?? payment.paymentMethodId}
                        </div>
                      ) : (
                        <select
                          value={payment.paymentMethodId}
                          onChange={(event) =>
                            setPayments((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      paymentMethodId: (
                                        event.currentTarget as HTMLSelectElement
                                      ).value,
                                      chequeNo: "",
                                      bank: "",
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          {options.paymentMethods.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    <label class="sales-field">
                      <span>Amount</span>
                      {isReadOnly ? (
                        <div class="sales-payment-value">
                          {formatAmount(parseDec(payment.amount))} XAF
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={payment.amount}
                          onInput={(event) =>
                            setPayments((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      amount: (
                                        event.currentTarget as HTMLInputElement
                                      ).value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      )}
                    </label>

                    <label class="sales-field">
                      <span>Cheque #</span>
                      {isReadOnly ? (
                        <div class="sales-payment-value">
                          {payment.chequeNo ?? "—"}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={payment.chequeNo ?? ""}
                          disabled={!isCheque}
                          placeholder={isCheque ? "Cheque number" : "—"}
                          onInput={(event) =>
                            setPayments((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      chequeNo: (
                                        event.currentTarget as HTMLInputElement
                                      ).value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      )}
                    </label>

                    <label class="sales-field">
                      <span>Bank</span>
                      {isReadOnly ? (
                        <div class="sales-payment-value">
                          {payment.bank ?? "—"}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={payment.bank ?? ""}
                          disabled={!isCheque}
                          placeholder={isCheque ? "Bank name" : "—"}
                          onInput={(event) =>
                            setPayments((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      bank: (
                                        event.currentTarget as HTMLInputElement
                                      ).value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      )}
                    </label>
                  </div>

                  {!isReadOnly ? (
                    <button
                      type="button"
                      class="sales-btn-secondary sales-payment-remove"
                      disabled={payments.length === 1}
                      onClick={() =>
                        setPayments((current) =>
                          current.filter((_, i) => i !== index),
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
        </section>
      ) : null}

      <div class="sales-actions">
        {!isReadOnly ? (
          <button
            type="button"
            class="sales-btn-primary"
            disabled={!canSave}
            onClick={() => void saveSale()}
          >
            {busy === "save" ? "Saving…" : "Save sale (create invoice)"}
          </button>
        ) : null}

        {saleId ? (
          <button
            type="button"
            class="sales-btn-secondary"
            disabled={busy !== null}
            onClick={() => setPrintOpen(true)}
          >
            Print invoice
          </button>
        ) : null}

        {saleId && saleStatus === "PENDING" && canValidate ? (
          <button
            type="button"
            class="sales-btn-secondary"
            disabled={busy !== null}
            onClick={() => void validateLoadedSale()}
          >
            {busy === "validate" ? "Validating…" : "Validate invoice"}
          </button>
        ) : null}

        {saleId && saleStatus === "PENDING" ? (
          <button
            type="button"
            class="sales-btn-danger"
            disabled={busy !== null}
            onClick={() => void deleteLoadedSale()}
          >
            {busy === "delete" ? "Deleting…" : "Delete invoice"}
          </button>
        ) : null}
      </div>

      {lineModal ? (
        <SalesLineModal
          line={lineModal.line}
          products={activeProducts}
          salesPointId={(() => {
            const parsed = Number.parseInt(salesPointId, 10);
            return Number.isFinite(parsed) ? parsed : null;
          })()}
          isBottleMode={isBottleMode}
          isSpecialDisposition={isSpecialDisposition}
          useRegisteredCustomer={useRegisteredCustomer}
          customerId={customerId}
          transactionDate={transactionDate}
          mode={lineModal.mode}
          onClose={() => setLineModal(null)}
          onSave={saveLineModal}
        />
      ) : null}
    </div>
  );
}
