import type { SalePrintPayload } from "../../shared/sales.types.js";
import { normalizeTaxRateDecimal } from "../../shared/taxRules.js";
import { loadReportSignatory } from "../reports/companySettings.js";
import { getDatabase } from "../db/index.js";
import { formatXaf, parseAmount } from "./money.js";

function formatRatePercentLabel(
  rateSnapshot: string | number | null | undefined,
  amount: string | number | null | undefined,
  baseNet: number,
): string {
  let rate = normalizeTaxRateDecimal(rateSnapshot);
  // Legacy rows used roundMoney(rate), which stored "0" for rates like 0.1925.
  if (rate === 0 && baseNet > 0) {
    const taxAmount = parseAmount(String(amount ?? "0"));
    if (taxAmount > 0) {
      rate = taxAmount / baseNet;
    }
  }
  return `${(rate * 100).toFixed(2)}%`;
}

export function loadSalePrintById(saleId: string): SalePrintPayload | null {
  const trimmed = saleId.trim();
  if (!trimmed) {
    return null;
  }

  const db = getDatabase();
  const sale = db
    .prepare(
      `SELECT s.*,
              c.taxpayerId,
              c.address AS customerAddress,
              c.phone AS customerPhone,
              sp.name AS salesPointName,
              cu.name AS salespersonName
       FROM Sale s
       LEFT JOIN Customer c ON c.id = s.customerId
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       LEFT JOIN User cu ON cu.id = s.createdByUserId
       WHERE s.id = ?`,
    )
    .get(trimmed) as Record<string, unknown> | undefined;

  if (!sale) {
    return null;
  }

  const settings = db
    .prepare(
      `SELECT companyName, department, logoUrl FROM CompanySettings WHERE id = 'default'`,
    )
    .get() as
    | { companyName: string; department: string | null; logoUrl: string | null }
    | undefined;

  const lines = db
    .prepare(
      `SELECT sl.*, p.productName, p.productCode, pc.productCat
       FROM SaleLine sl
       INNER JOIN Product p ON p.productId = sl.productId
       INNER JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE sl.saleId = ?
       ORDER BY sl.id ASC`,
    )
    .all(trimmed) as Array<Record<string, unknown>>;

  const payments = db
    .prepare(
      `SELECT pay.amount, pay.paidAt, pm.name AS methodName
       FROM Payment pay
       INNER JOIN PaymentMethodDefinition pm ON pm.id = pay.paymentMethodId
       WHERE pay.saleId = ?
       ORDER BY pay.id ASC`,
    )
    .all(trimmed) as Array<{
    amount: string;
    paidAt: string | null;
    methodName: string;
  }>;

  const taxes = db
    .prepare(
      `SELECT labelSnapshot, rateSnapshot, amount
       FROM SaleAppliedTax WHERE saleId = ? ORDER BY id ASC`,
    )
    .all(trimmed) as Array<{
    labelSnapshot: string;
    rateSnapshot: string;
    amount: string;
  }>;

  const isBottleSale = sale.saleProductMode === "BOTTLE";
  const dateIssued = String(sale.dateIssued ?? sale.soldAt);
  const signatory = loadReportSignatory(dateIssued.slice(0, 10));
  const netAmount = String(sale.netAmount);
  const netForRate = parseAmount(netAmount);

  return {
    companyName: settings?.companyName ?? "Sales Electron",
    department: settings?.department ?? null,
    serviceName: sale.commercialServiceNameSnapshot
      ? String(sale.commercialServiceNameSnapshot)
      : null,
    companyPhone: sale.issuerPhoneSnapshot
      ? String(sale.issuerPhoneSnapshot)
      : null,
    companyAddress: sale.issuerAddressSnapshot
      ? String(sale.issuerAddressSnapshot)
      : null,
    logoUrl: settings?.logoUrl ?? null,
    signatoryName: signatory.name,
    signatoryTitle: signatory.title,
    sale: {
      invoiceNo: String(sale.invoiceNo),
      status: String(sale.status),
      soldAtIso: String(sale.soldAt),
      vehicleNumber: String(sale.vehicleNumber),
      dateIssuedIso: dateIssued,
      deliveryOrderNo: sale.deliveryOrderNo
        ? String(sale.deliveryOrderNo)
        : null,
      referenceNumber: sale.referenceNumber
        ? String(sale.referenceNumber)
        : null,
      customerName: String(sale.customerNameSnapshot),
      customerAddress: sale.customerAddress
        ? String(sale.customerAddress)
        : null,
      customerPhone: sale.customerPhone ? String(sale.customerPhone) : null,
      taxpayerId: sale.taxpayerId ? String(sale.taxpayerId) : null,
      salespersonName: sale.salespersonName
        ? String(sale.salespersonName)
        : null,
      salesPointName: sale.salesPointName ? String(sale.salesPointName) : null,
      saleProductMode: sale.saleProductMode
        ? String(sale.saleProductMode)
        : null,
      saleDisposition: sale.saleDisposition
        ? String(sale.saleDisposition)
        : null,
      netAmount,
      vatAmount: String(sale.vatAmount),
      grossAmount: String(sale.grossAmount),
      appliedTaxes: taxes.map((tax) => ({
        label: tax.labelSnapshot,
        ratePercent: formatRatePercentLabel(
          tax.rateSnapshot,
          tax.amount,
          netForRate,
        ),
        amount: formatXaf(tax.amount),
      })),
      lines: lines.map((line, index) => {
        const useUnits = isBottleSale && line.qtyUnits != null;
        return {
          lineNo: index + 1,
          productCode: line.productCode ? String(line.productCode) : null,
          productName: String(line.productName),
          productCat: String(line.productCat),
          qty: useUnits ? String(line.qtyUnits) : String(line.qtyKg),
          unitLabel: useUnits ? "unit" : "kg",
          unitPrice: useUnits
            ? String(line.unitPricePerUnit ?? line.unitPricePerKg)
            : String(line.unitPricePerKg),
          lineNet: String(line.lineNet),
        };
      }),
      payments: payments.map((payment) => ({
        methodName: payment.methodName,
        amount: formatXaf(payment.amount),
        paymentDate: payment.paidAt
          ? String(payment.paidAt).slice(0, 10)
          : null,
      })),
    },
  };
}
