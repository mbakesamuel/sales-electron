import type {
  CreateSaleInput,
  LoadedSaleView,
  PendingSaleRow,
  SalesFormOptions,
  SalesListFilters,
  SalesListResult,
  SaveSaleResult,
  SaleMutationResult,
  UnitPricePreviewResult,
} from "../../shared/sales.types.js";
import {
  resolveCustomerTaxProfile,
  SALES_TAX_LABEL,
} from "../../shared/taxRules.js";
import { assertRouteWrite, canPerformAction } from "../auth/permissions/service.js";
import { getDatabase } from "../db/index.js";
import {
  getCustomerTypeIdForCustomer,
  resolveUnitPriceExTax,
} from "../pricing/resolveUnitPrice.js";
import { loadTaxRatesAsOf } from "../tax/resolveRates.js";
import { assertSaleLinesStockAsOf, deductStockForValidatedSale } from "../stock/sales.js";
import { isInsufficientStockError } from "../stock/errors.js";
import { allocateInvoiceNo, newPaymentId, newSaleId, newSaleLineId } from "./invoice.js";
import { formatXaf, parseAmount, roundMoney, trimQty } from "./money.js";
import { assertDateInOpenMonth } from "../financialYears/service.js";

function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getVatRateDecimal(): string {
  return String(loadTaxRatesAsOf(todayIsoDate()).vatRate);
}

function parseCustomerId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatProductSummary(
  lines: Array<{ productName: string; qtyKg: string }>,
): string {
  if (lines.length === 0) {
    return "";
  }

  if (lines.length === 1) {
    return lines[0].productName;
  }

  return `${lines[0].productName} +${lines.length - 1} more`;
}

function getInvoiceOnlyTaxRegimeId(db: ReturnType<typeof getDatabase>): string | null {
  const simplified = db
    .prepare(
      `SELECT id FROM TaxRegime
       WHERE kind = 'SIMPLIFIED'
       ORDER BY name ASC
       LIMIT 1`,
    )
    .get() as { id: string } | undefined;

  if (simplified) {
    return simplified.id;
  }

  return (
    (db.prepare(`SELECT id FROM TaxRegime ORDER BY name ASC LIMIT 1`).get() as
      | { id: string }
      | undefined)?.id ?? null
  );
}

export function getSalesFormOptions(): SalesFormOptions {
  const db = getDatabase();

  const customers = db
    .prepare(
      `SELECT c.id, c.name, c.taxRegimeId, c.residency, c.taxpayerId,
              tr.name AS taxRegimeName, tr.kind AS taxRegimeKind
       FROM Customer c
       LEFT JOIN TaxRegime tr ON tr.id = c.taxRegimeId
       WHERE COALESCE(c.isPosPlaceholder, 0) = 0
       ORDER BY c.name ASC
       LIMIT 200`,
    )
    .all() as Array<{
    id: number;
    name: string;
    taxRegimeId: string | null;
    residency: string;
    taxpayerId: string | null;
    taxRegimeName: string | null;
    taxRegimeKind: string | null;
  }>;

  const products = db
    .prepare(
      `SELECT p.productId, p.productName, pc.productCat, pc.isBottled
       FROM Product p
       INNER JOIN ProductCat pc ON pc.productCatId = p.productCatId
       ORDER BY p.productName ASC
       LIMIT 200`,
    )
    .all() as Array<{
    productId: number;
    productName: string;
    productCat: string;
    isBottled: number;
  }>;

  const looseProducts = products
    .filter((product) => product.isBottled !== 1)
    .map(({ productId, productName, productCat }) => ({
      productId,
      productName,
      productCat,
    }));

  const bottledProducts = products
    .filter((product) => product.isBottled === 1)
    .map(({ productId, productName, productCat }) => ({
      productId,
      productName,
      productCat,
    }));

  const paymentMethods = db
    .prepare(
      `SELECT id, code, name, kind
       FROM PaymentMethodDefinition
       WHERE isActive = 1 AND kind != 'CREDIT'
       ORDER BY sortOrder ASC, name ASC`,
    )
    .all() as SalesFormOptions["paymentMethods"];

  const salesPoints = db
    .prepare(`SELECT id, name FROM SalesPoint ORDER BY name ASC LIMIT 200`)
    .all() as SalesFormOptions["salesPoints"];

  const storageLocations = db
    .prepare(
      `SELECT sl.id, sl.salesPointId, l.locationName AS name, sl.isDefault
       FROM StorageLocation sl
       INNER JOIN Location l ON l.id = sl.locationId
       ORDER BY sl.salesPointId ASC, l.locationName ASC
       LIMIT 1000`,
    )
    .all() as Array<{
    id: number;
    salesPointId: number;
    name: string;
    isDefault: number;
  }>;

  const company = db
    .prepare(`SELECT companyName, vatRate FROM CompanySettings WHERE id = 'default'`)
    .get() as { companyName: string; vatRate: string } | undefined;

  const rates = loadTaxRatesAsOf(todayIsoDate());
  const companyVatRate = String(rates.vatRate);
  const mappedCustomers = customers.map((customer) => {
    const tax = resolveCustomerTaxProfile({
      residency: customer.residency,
      taxRegimeKind: customer.taxRegimeKind,
      taxpayerId: customer.taxpayerId,
      rates,
    });
    return {
      id: customer.id,
      name: customer.name,
      taxRegimeId: customer.taxRegimeId,
      taxRegimeName: customer.taxRegimeName,
      taxRegimeKind: customer.taxRegimeKind,
      residency: customer.residency,
      taxpayerId: customer.taxpayerId,
      vatApplies: tax.vatApplies,
      salesTaxRate: tax.salesTaxRate,
    };
  });

  const mappedLocations = storageLocations.map((location) => ({
    id: location.id,
    salesPointId: location.salesPointId,
    name: location.name,
    isDefault: location.isDefault === 1,
  }));

  const botaSalesPoint =
    salesPoints.find((point) => point.name.toUpperCase().includes("BOTA")) ?? null;
  const bottleOilStoreLocation =
    mappedLocations.find(
      (location) =>
        botaSalesPoint != null &&
        location.salesPointId === botaSalesPoint.id &&
        location.name.toLowerCase().includes("bottle"),
    ) ?? null;

  return {
    customers: mappedCustomers,
    looseProducts,
    bottledProducts,
    paymentMethods,
    salesPoints,
    storageLocations: mappedLocations,
    vatRateDecimal: companyVatRate,
    companyName: company?.companyName ?? "Sales Electron",
    botaSalesPointId: botaSalesPoint?.id ?? null,
    bottleOilStoreLocationId: bottleOilStoreLocation?.id ?? null,
    invoiceOnlyTaxRegimeId: getInvoiceOnlyTaxRegimeId(db),
  };
}

export function previewSaleUnitPrice(input: {
  productId: number;
  asOfDate: string;
  customerId?: number | null;
}): UnitPricePreviewResult {
  if (!Number.isFinite(input.productId) || input.productId <= 0) {
    return { ok: false, error: "Product is required." };
  }

  const asOfDate = input.asOfDate?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
    return { ok: false, error: "Transaction date must be YYYY-MM-DD." };
  }

  let customerTypeId: string | null = null;
  if (input.customerId != null) {
    const cid = parseCustomerId(input.customerId);
    if (cid == null) {
      return { ok: false, error: "Customer not found." };
    }

    const customer = getDatabase()
      .prepare(`SELECT id FROM Customer WHERE id = ?`)
      .get(cid) as { id: number } | undefined;
    if (!customer) {
      return { ok: false, error: "Customer not found." };
    }

    customerTypeId = getCustomerTypeIdForCustomer(cid);
  }

  const result = resolveUnitPriceExTax(input.productId, customerTypeId, asOfDate);
  if (!result.ok) {
    return result;
  }

  return { ok: true, unitPriceExTax: result.unitPriceExTax };
}

export function listPendingSales(): PendingSaleRow[] {
  const rows = getDatabase()
    .prepare(
      `SELECT s.invoiceNo, s.soldAt, s.grossAmount, s.customerNameSnapshot,
              sp.name AS salesPointName
       FROM Sale s
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       WHERE s.status = 'PENDING'
       ORDER BY s.soldAt DESC, s.invoiceNo DESC
       LIMIT 200`,
    )
    .all() as Array<{
    invoiceNo: string;
    soldAt: string;
    grossAmount: string;
    customerNameSnapshot: string;
    salesPointName: string | null;
  }>;

  return rows.map((row) => ({
    invoiceNo: row.invoiceNo,
    soldAtIso: row.soldAt.slice(0, 10),
    customerName: row.customerNameSnapshot,
    totalLabel: formatXaf(row.grossAmount),
    salesPointName: row.salesPointName,
  }));
}

export function loadSaleByInvoiceNo(invoiceNo: string): LoadedSaleView | null {
  const trimmed = invoiceNo.trim();
  if (!trimmed) {
    return null;
  }

  const db = getDatabase();
  const sale = db
    .prepare(
      `SELECT s.*, sp.name AS salesPointName,
              cu.name AS createdByName, vu.name AS validatedByName
       FROM Sale s
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       INNER JOIN User cu ON cu.id = s.createdByUserId
       LEFT JOIN User vu ON vu.id = s.validatedByUserId
       WHERE s.invoiceNo = ?`,
    )
    .get(trimmed) as Record<string, unknown> | undefined;

  if (!sale) {
    return null;
  }

  const lines = db
    .prepare(
      `SELECT sl.*, p.productName, pc.productCat
       FROM SaleLine sl
       INNER JOIN Product p ON p.productId = sl.productId
       INNER JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE sl.saleId = ?
       ORDER BY sl.id ASC`,
    )
    .all(sale.id) as Array<Record<string, unknown>>;

  const payments = db
    .prepare(
      `SELECT pay.*, pm.code AS methodCode, pm.name AS methodName, pm.kind
       FROM Payment pay
       INNER JOIN PaymentMethodDefinition pm ON pm.id = pay.paymentMethodId
       WHERE pay.saleId = ?
       ORDER BY pay.id ASC`,
    )
    .all(sale.id) as Array<Record<string, unknown>>;

  return {
    id: String(sale.id),
    invoiceNo: String(sale.invoiceNo),
    soldAtIso: String(sale.soldAt),
    referenceNumber: sale.referenceNumber ? String(sale.referenceNumber) : null,
    salesPointId: sale.salesPointId != null ? Number(sale.salesPointId) : null,
    salesPointName: sale.salesPointName ? String(sale.salesPointName) : null,
    customerId: sale.customerId != null ? Number(sale.customerId) : null,
    customerName: String(sale.customerNameSnapshot),
    createdByUserId: String(sale.createdByUserId),
    createdByName: String(sale.createdByName),
    status: sale.status as LoadedSaleView["status"],
    validatedAtIso: sale.validatedAt ? String(sale.validatedAt) : null,
    validatedByName: sale.validatedByName ? String(sale.validatedByName) : null,
    vehicleNumber: String(sale.vehicleNumber),
    dateIssuedIso: String(sale.dateIssued ?? sale.soldAt),
    deliveryOrderNo: sale.deliveryOrderNo ? String(sale.deliveryOrderNo) : null,
    saleProductMode: sale.saleProductMode
      ? (String(sale.saleProductMode) as LoadedSaleView["saleProductMode"])
      : null,
    saleDisposition: sale.saleDisposition
      ? (String(sale.saleDisposition) as LoadedSaleView["saleDisposition"])
      : null,
    netAmount: String(sale.netAmount),
    vatAmount: String(sale.vatAmount),
    grossAmount: String(sale.grossAmount),
    lines: lines.map((line) => ({
      productId: Number(line.productId),
      productName: String(line.productName),
      productCat: String(line.productCat),
      storageLocationId:
        line.storageLocationId != null ? Number(line.storageLocationId) : null,
      qtyKg: String(line.qtyKg),
      qtyUnits: line.qtyUnits != null ? String(line.qtyUnits) : null,
      unitPricePerKg: String(line.unitPricePerKg),
      unitPricePerUnit:
        line.unitPricePerUnit != null ? String(line.unitPricePerUnit) : null,
      lineNet: String(line.lineNet),
      lineVat: String(line.lineVat),
      lineGross: String(line.lineGross),
    })),
    payments: payments.map((payment) => ({
      paymentMethodId: String(payment.paymentMethodId),
      methodCode: String(payment.methodCode),
      methodName: String(payment.methodName),
      kind: payment.kind as LoadedSaleView["payments"][number]["kind"],
      amount: String(payment.amount),
      chequeNo: payment.chequeNo ? String(payment.chequeNo) : null,
      bank: payment.bank ? String(payment.bank) : null,
      traiteNo: payment.traiteNo ? String(payment.traiteNo) : null,
      traiteIssuedOn: payment.traiteIssuedOn ? String(payment.traiteIssuedOn) : null,
      traiteMaturityOn: payment.traiteMaturityOn
        ? String(payment.traiteMaturityOn)
        : null,
      paidAtIso: String(payment.paidAt),
    })),
  };
}

export function listSales(filters: SalesListFilters = {}): SalesListResult {
  const db = getDatabase();
  const q = String(filters.q ?? "").trim();
  const period = filters.period ?? "month";
  const params: unknown[] = [];
  const whereParts: string[] = [];

  if (q) {
    whereParts.push(`s.invoiceNo LIKE ?`);
    params.push(`%${q}%`);
  }

  let periodLabel = "All time";
  const now = new Date();
  if (period === "month") {
    whereParts.push(`strftime('%Y', s.soldAt) = ?`);
    whereParts.push(`strftime('%m', s.soldAt) = ?`);
    params.push(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
    periodLabel = "Current month";
  } else if (period === "year") {
    whereParts.push(`strftime('%Y', s.soldAt) = ?`);
    params.push(String(now.getFullYear()));
    periodLabel = "Current year";
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT s.id, s.invoiceNo, s.soldAt, s.status, s.grossAmount,
              s.customerNameSnapshot, s.deliveryOrderNo, sp.name AS salesPointName
       FROM Sale s
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       ${whereClause}
       ORDER BY s.soldAt DESC, s.invoiceNo DESC
       LIMIT 300`,
    )
    .all(...params) as Array<Record<string, unknown>>;

  let totalAmount = 0;
  let totalQty = 0;
  const listRows: SalesListResult["rows"] = [];

  for (const row of rows) {
    const lineRows = db
      .prepare(
        `SELECT sl.qtyKg, p.productName
         FROM SaleLine sl
         INNER JOIN Product p ON p.productId = sl.productId
         WHERE sl.saleId = ?`,
      )
      .all(row.id) as Array<{ qtyKg: string; productName: string }>;

    const gross = parseAmount(String(row.grossAmount));
    let rowQty = 0;
    for (const line of lineRows) {
      rowQty += parseAmount(line.qtyKg);
    }
    totalAmount += gross;
    totalQty += rowQty;

    listRows.push({
      id: String(row.id),
      invoiceNo: String(row.invoiceNo),
      soldAtIso: String(row.soldAt).slice(0, 10),
      salesPointName: row.salesPointName ? String(row.salesPointName) : "",
      deliveryOrderNo: row.deliveryOrderNo ? String(row.deliveryOrderNo) : null,
      customerName: String(row.customerNameSnapshot),
      productSummary: formatProductSummary(lineRows),
      status: row.status as SalesListResult["rows"][number]["status"],
      totalQtyLabel: `${trimQty(rowQty)} kg`,
      totalAmountXaf: formatXaf(gross),
    });
  }

  return {
    rows: listRows,
    totals: {
      count: listRows.length,
      totalQtyLabel: `${trimQty(totalQty)} kg`,
      totalAmountXaf: formatXaf(totalAmount),
    },
    periodLabel,
  };
}

export function createSale(input: CreateSaleInput): SaveSaleResult {
  const db = getDatabase();

  if (!input.userId) {
    return { ok: false, error: "Login required." };
  }

  const role = getDatabase()
    .prepare(`SELECT role FROM User WHERE id = ?`)
    .get(input.userId) as { role: string } | undefined;

  if (!role) {
    return { ok: false, error: "User not found." };
  }

  try {
    assertRouteWrite(role.role, "sales");
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Permission denied.",
    };
  }

  const saleProductMode = input.saleProductMode ?? "LOOSE";
  const saleDisposition = input.saleDisposition ?? "NORMAL";
  const isBottleMode = saleProductMode === "BOTTLE";
  const isSpecialDisposition =
    saleDisposition === "RATION" || saleDisposition === "PUBLIC_RELATION";
  const registeredCustomerId = parseCustomerId(input.customerId);
  const useRegisteredCustomer =
    !isSpecialDisposition && registeredCustomerId != null;

  if (!useRegisteredCustomer && !input.customerNameOverride?.trim()) {
    return { ok: false, error: "Enter the customer name on the invoice." };
  }

  if (useRegisteredCustomer && registeredCustomerId == null) {
    return { ok: false, error: "Select a customer." };
  }

  if (!isBottleMode && !isSpecialDisposition && !input.vehicleNumber.trim()) {
    return { ok: false, error: "Enter a vehicle number." };
  }

  const activeLines = input.lines.filter((line) => {
    if (!line.productId) {
      return false;
    }

    if (isBottleMode) {
      return parseAmount(line.qtyUnits ?? line.qtyKg) > 0;
    }

    return parseAmount(line.qtyKg) > 0;
  });

  if (activeLines.length === 0) {
    return { ok: false, error: "Add at least one line item." };
  }

  let customerId: number | null = null;
  let customerNameSnapshot: string;
  let taxRegimeId: string | null;
  let vatApplies = false;
  let salesTaxRate = 0;
  let vatRate = 0;

  if (useRegisteredCustomer) {
    const customer = db
      .prepare(
        `SELECT c.id, c.name, c.taxRegimeId, c.residency, c.taxpayerId,
                tr.kind AS taxRegimeKind
         FROM Customer c
         LEFT JOIN TaxRegime tr ON tr.id = c.taxRegimeId
         WHERE c.id = ?`,
      )
      .get(registeredCustomerId!) as
      | {
          id: number;
          name: string;
          taxRegimeId: string | null;
          residency: string;
          taxpayerId: string | null;
          taxRegimeKind: string | null;
        }
      | undefined;

    if (!customer) {
      return { ok: false, error: "Customer not found." };
    }

    customerId = customer.id;
    customerNameSnapshot = customer.name;
    taxRegimeId = customer.taxRegimeId;

    const asOfDate = (input.dateIssued || todayIsoDate()).trim().slice(0, 10);
    const rates = loadTaxRatesAsOf(asOfDate);
    const tax = resolveCustomerTaxProfile({
      residency: customer.residency,
      taxRegimeKind: customer.taxRegimeKind,
      taxpayerId: customer.taxpayerId,
      rates,
    });
    vatApplies = tax.vatApplies;
    vatRate = tax.vatRate;
    salesTaxRate = tax.salesTaxRate;
  } else {
    customerNameSnapshot = input.customerNameOverride!.trim();
    taxRegimeId = getInvoiceOnlyTaxRegimeId(db);
  }

  const skipTax = isBottleMode || isSpecialDisposition;
  if (skipTax || !useRegisteredCustomer) {
    vatApplies = false;
    vatRate = 0;
    salesTaxRate = 0;
  }

  if (input.deliveryOrderNo?.trim() && !isBottleMode && !isSpecialDisposition) {
    if (!useRegisteredCustomer || !customerId) {
      return {
        ok: false,
        error: "Delivery orders require a registered customer from the directory.",
      };
    }

    const doRow = db
      .prepare(
        `SELECT customerId FROM DeliveryOrder
         WHERE deliveryOrderNo = ? AND status = 'VALIDATED'`,
      )
      .get(input.deliveryOrderNo.trim()) as { customerId: number } | undefined;

    if (!doRow) {
      return { ok: false, error: "Delivery order not found or not validated." };
    }

    if (doRow.customerId !== customerId) {
      return {
        ok: false,
        error: "Selected customer does not match the delivery order.",
      };
    }
  }

  let netTotal = 0;
  let vatTotal = 0;
  let salesTaxTotal = 0;
  const computedLines = activeLines.map((line) => {
    if (isSpecialDisposition) {
      return {
        ...line,
        qtyKg: isBottleMode
          ? roundMoney(parseAmount(line.qtyUnits ?? line.qtyKg))
          : roundMoney(parseAmount(line.qtyKg)),
        qtyUnits: isBottleMode ? roundMoney(parseAmount(line.qtyUnits ?? line.qtyKg)) : null,
        unitPricePerKg: "0",
        unitPricePerUnit: isBottleMode ? "0" : null,
        lineNet: "0.00",
        lineVat: "0.00",
        lineGross: "0.00",
      };
    }

    if (isBottleMode) {
      const qty = parseAmount(line.qtyUnits ?? line.qtyKg);
      const unitPrice = parseAmount(line.unitPricePerUnit ?? line.unitPricePerKg);
      const lineGross = qty * unitPrice;
      netTotal += lineGross;
      return {
        ...line,
        qtyKg: roundMoney(qty),
        qtyUnits: roundMoney(qty),
        unitPricePerKg: roundMoney(unitPrice),
        unitPricePerUnit: roundMoney(unitPrice),
        lineNet: roundMoney(lineGross),
        lineVat: "0.00",
        lineGross: roundMoney(lineGross),
      };
    }

    const qty = parseAmount(line.qtyKg);
    const unitPrice = parseAmount(line.unitPricePerKg);
    const lineNet = qty * unitPrice;
    const lineVat = vatApplies ? lineNet * vatRate : 0;
    const lineSalesTax = lineNet * salesTaxRate;
    const lineGross = lineNet + lineVat + lineSalesTax;
    netTotal += lineNet;
    vatTotal += lineVat;
    salesTaxTotal += lineSalesTax;

    return {
      ...line,
      lineNet: roundMoney(lineNet),
      lineVat: roundMoney(lineVat),
      lineGross: roundMoney(lineGross),
    };
  });

  const grossTotal = isBottleMode ? netTotal : netTotal + vatTotal + salesTaxTotal;
  if (isBottleMode) {
    vatTotal = 0;
    salesTaxTotal = 0;
  }

  // Match UI totals: round net first, then tax on that net (FCFA have no decimals).
  // Comparing raw floats against the rounded paid amount caused false "must equal" failures.
  const invoiceNet = Math.round(isBottleMode ? grossTotal : netTotal);
  const invoiceVat = isBottleMode ? 0 : Math.round(invoiceNet * (vatApplies ? vatRate : 0));
  const invoiceSalesTax = isBottleMode ? 0 : Math.round(invoiceNet * salesTaxRate);
  const invoiceGross = isBottleMode
    ? invoiceNet
    : invoiceNet + invoiceVat + invoiceSalesTax;

  const paidTotal = isSpecialDisposition
    ? 0
    : Math.round(
        input.payments.reduce((sum, payment) => sum + parseAmount(payment.amount), 0),
      );

  if (!isSpecialDisposition && paidTotal !== invoiceGross) {
    return {
      ok: false,
      error: "Paid amount must equal invoice total (no credit sales).",
    };
  }

  const saleId = newSaleId();
  const invoiceNo = allocateInvoiceNo(db);
  const soldAt = input.dateIssued || nowIso().slice(0, 10);

  let postingPeriod;
  try {
    postingPeriod = assertDateInOpenMonth(soldAt);
  } catch (periodError) {
    return {
      ok: false,
      error:
        periodError instanceof Error
          ? periodError.message
          : "Open a financial month before posting.",
    };
  }

  if (input.salesPointId != null && Number.isFinite(input.salesPointId)) {
    try {
      assertSaleLinesStockAsOf(db, {
        salesPointId: input.salesPointId,
        dateIssued: soldAt,
        isBottleMode,
        lines: computedLines.map((line) => ({
          productId: line.productId,
          qtyKg: line.qtyKg,
          qtyUnits: line.qtyUnits ?? null,
          storageLocationId: line.storageLocationId ?? null,
        })),
      });
    } catch (stockError) {
      if (isInsufficientStockError(stockError)) {
        return { ok: false, error: stockError.message };
      }
      return {
        ok: false,
        error:
          stockError instanceof Error ? stockError.message : "Could not verify stock.",
      };
    }
  }

  const timestamp = nowIso();

  const insertSale = db.prepare(
    `INSERT INTO Sale (
      id, invoiceNo, soldAt, customerId, createdByUserId, customerNameSnapshot,
      taxRegimeId, vatRateSnapshot, netAmount, vatAmount, grossAmount,
      createdAt, updatedAt, referenceNumber, salesPointId, status,
      vehicleNumber, dateIssued, deliveryOrderNo, saleProductMode, saleDisposition,
      financialYear, financialMonth, postingCalendarYear
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const insertLine = db.prepare(
    `INSERT INTO SaleLine (
      id, saleId, productId, qtyKg, unitPricePerKg, lineNet, lineVat, lineGross,
      qtyUnits, unitPricePerUnit, storageLocationId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const insertPayment = db.prepare(
    `INSERT INTO Payment (
      id, saleId, amount, chequeNo, paidAt, createdAt, bank,
      traiteNo, traiteIssuedOn, traiteMaturityOn, paymentMethodId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    insertSale.run(
      saleId,
      invoiceNo,
      soldAt,
      customerId,
      input.userId,
      customerNameSnapshot,
      taxRegimeId,
      roundMoney(vatRate),
      roundMoney(invoiceNet),
      roundMoney(invoiceVat),
      roundMoney(invoiceGross),
      timestamp,
      timestamp,
      input.referenceNumber?.trim() || null,
      input.salesPointId ?? null,
      input.vehicleNumber.trim() || (isBottleMode ? "BPO-OUTBOUND" : ""),
      soldAt,
      isBottleMode || isSpecialDisposition
        ? null
        : input.deliveryOrderNo?.trim() || null,
      saleProductMode,
      saleDisposition,
      postingPeriod.financialYear,
      postingPeriod.calendarMonth,
      postingPeriod.financialYear,
    );

    for (const line of computedLines) {
      insertLine.run(
        newSaleLineId(),
        saleId,
        line.productId,
        line.qtyKg ?? roundMoney(parseAmount(line.qtyKg)),
        line.unitPricePerKg ?? roundMoney(parseAmount(line.unitPricePerKg)),
        line.lineNet,
        line.lineVat,
        line.lineGross,
        line.qtyUnits ?? null,
        line.unitPricePerUnit ?? null,
        line.storageLocationId ?? null,
      );
    }

    if (!isSpecialDisposition) {
      for (const payment of input.payments) {
        if (parseAmount(payment.amount) <= 0) {
          continue;
        }

        insertPayment.run(
          newPaymentId(),
          saleId,
          roundMoney(parseAmount(payment.amount)),
          payment.chequeNo?.trim() || null,
          timestamp,
          timestamp,
          payment.bank?.trim() || null,
          payment.traiteNo?.trim() || null,
          payment.traiteIssuedOn || null,
          payment.traiteMaturityOn || null,
          payment.paymentMethodId,
        );
      }
    }

    if (vatApplies && invoiceVat > 0) {
      db.prepare(
        `INSERT INTO SaleAppliedTax (
          id, saleId, codeSnapshot, labelSnapshot, rateSnapshot, amount, createdAt
        ) VALUES (?, ?, 'VAT', 'VAT', ?, ?, ?)`,
      ).run(newSaleLineId(), saleId, roundMoney(vatRate), roundMoney(invoiceVat), timestamp);
    }

    if (invoiceSalesTax > 0) {
      db.prepare(
        `INSERT INTO SaleAppliedTax (
          id, saleId, codeSnapshot, labelSnapshot, rateSnapshot, amount, createdAt
        ) VALUES (?, ?, 'SALES_TAX', ?, ?, ?, ?)`,
      ).run(
        newSaleLineId(),
        saleId,
        SALES_TAX_LABEL,
        roundMoney(salesTaxRate),
        roundMoney(invoiceSalesTax),
        timestamp,
      );
    }
  });

  try {
    tx();
    return { ok: true, saleId, invoiceNo };
  } catch (error) {
    if (isInsufficientStockError(error)) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create sale.",
    };
  }
}

export function validateSale(saleId: string, userId: string): SaleMutationResult {
  const db = getDatabase();
  const user = db
    .prepare(`SELECT role FROM User WHERE id = ?`)
    .get(userId) as { role: string } | undefined;

  if (!user || !canPerformAction(user.role, "validate_sales")) {
    return { ok: false, error: "You do not have permission to validate sales." };
  }

  const existing = db
    .prepare(
      `SELECT id, status, salesPointId, saleProductMode, dateIssued
       FROM Sale WHERE id = ?`,
    )
    .get(saleId) as
    | {
        id: string;
        status: string;
        salesPointId: number | null;
        saleProductMode: string | null;
        dateIssued: string | null;
      }
    | undefined;

  if (!existing) {
    return { ok: false, error: "Sale not found." };
  }

  if (existing.status === "VALIDATED") {
    return { ok: true };
  }

  const validatedAt = nowIso();
  const dateIssued = String(existing.dateIssued ?? validatedAt).slice(0, 10);
  const isBottleMode = existing.saleProductMode === "BOTTLE";

  try {
    const tx = db.transaction(() => {
      if (existing.salesPointId != null) {
        const lines = db
          .prepare(
            `SELECT productId, qtyKg, qtyUnits, storageLocationId
             FROM SaleLine
             WHERE saleId = ?
             ORDER BY id ASC`,
          )
          .all(saleId) as Array<{
          productId: number;
          qtyKg: string;
          qtyUnits: string | null;
          storageLocationId: number | null;
        }>;

        assertSaleLinesStockAsOf(db, {
          salesPointId: existing.salesPointId,
          dateIssued,
          isBottleMode,
          lines,
          excludeSaleId: saleId,
        });
      }

      db.prepare(
        `UPDATE Sale
         SET status = 'VALIDATED', validatedAt = ?, validatedByUserId = ?, updatedAt = ?
         WHERE id = ?`,
      ).run(validatedAt, userId, validatedAt, saleId);

      deductStockForValidatedSale(db, saleId, userId, validatedAt);
    });

    tx();
    return { ok: true };
  } catch (error) {
    if (isInsufficientStockError(error)) {
      return { ok: false, error: error.message };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not validate sale.",
    };
  }
}

export function deleteSale(saleId: string, userId: string): SaleMutationResult {
  const db = getDatabase();
  const role = db
    .prepare(`SELECT role FROM User WHERE id = ?`)
    .get(userId) as { role: string } | undefined;

  if (!role) {
    return { ok: false, error: "User not found." };
  }

  try {
    assertRouteWrite(role.role, "sales");
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Permission denied.",
    };
  }

  const existing = db
    .prepare(`SELECT id, status FROM Sale WHERE id = ?`)
    .get(saleId) as { id: string; status: string } | undefined;

  if (!existing) {
    return { ok: false, error: "Sale not found." };
  }

  if (existing.status === "VALIDATED") {
    return { ok: false, error: "Validated invoices cannot be deleted." };
  }

  db.prepare(`DELETE FROM Sale WHERE id = ?`).run(saleId);
  return { ok: true };
}
