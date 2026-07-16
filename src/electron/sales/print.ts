import type { SalePrintPayload } from "../../shared/sales.types.js";
import { getDatabase } from "../db/index.js";
import { formatXaf, parseAmount } from "./money.js";

export function loadSalePrintById(saleId: string): SalePrintPayload | null {
  const trimmed = saleId.trim();
  if (!trimmed) {
    return null;
  }

  const db = getDatabase();
  const sale = db
    .prepare(
      `SELECT s.*, c.taxpayerId
       FROM Sale s
       LEFT JOIN Customer c ON c.id = s.customerId
       WHERE s.id = ?`,
    )
    .get(trimmed) as Record<string, unknown> | undefined;

  if (!sale) {
    return null;
  }

  const settings = db
    .prepare(`SELECT companyName, department, logoUrl FROM CompanySettings WHERE id = 'default'`)
    .get() as { companyName: string; department: string | null; logoUrl: string | null } | undefined;

  const lines = db
    .prepare(
      `SELECT sl.*, p.productName, pc.productCat
       FROM SaleLine sl
       INNER JOIN Product p ON p.productId = sl.productId
       INNER JOIN ProductCat pc ON pc.productCatId = p.productCatId
       WHERE sl.saleId = ?
       ORDER BY sl.id ASC`,
    )
    .all(trimmed) as Array<Record<string, unknown>>;

  const payments = db
    .prepare(
      `SELECT pay.amount, pm.name AS methodName
       FROM Payment pay
       INNER JOIN PaymentMethodDefinition pm ON pm.id = pay.paymentMethodId
       WHERE pay.saleId = ?
       ORDER BY pay.id ASC`,
    )
    .all(trimmed) as Array<{ amount: string; methodName: string }>;

  const taxes = db
    .prepare(
      `SELECT labelSnapshot, rateSnapshot, amount
       FROM SaleAppliedTax WHERE saleId = ? ORDER BY id ASC`,
    )
    .all(trimmed) as Array<{ labelSnapshot: string; rateSnapshot: string; amount: string }>;

  const isBottleSale = sale.saleProductMode === "BOTTLE";

  return {
    companyName: settings?.companyName ?? "Sales Electron",
    department: settings?.department ?? null,
    companyPhone: sale.issuerPhoneSnapshot ? String(sale.issuerPhoneSnapshot) : null,
    companyAddress: sale.issuerAddressSnapshot
      ? String(sale.issuerAddressSnapshot)
      : null,
    logoUrl: settings?.logoUrl ?? null,
    sale: {
      invoiceNo: String(sale.invoiceNo),
      status: String(sale.status),
      soldAtIso: String(sale.soldAt),
      vehicleNumber: String(sale.vehicleNumber),
      dateIssuedIso: String(sale.dateIssued ?? sale.soldAt),
      deliveryOrderNo: sale.deliveryOrderNo ? String(sale.deliveryOrderNo) : null,
      referenceNumber: sale.referenceNumber ? String(sale.referenceNumber) : null,
      customerName: String(sale.customerNameSnapshot),
      taxpayerId: sale.taxpayerId ? String(sale.taxpayerId) : null,
      saleProductMode: sale.saleProductMode ? String(sale.saleProductMode) : null,
      saleDisposition: sale.saleDisposition ? String(sale.saleDisposition) : null,
      netAmount: String(sale.netAmount),
      vatAmount: String(sale.vatAmount),
      grossAmount: String(sale.grossAmount),
      appliedTaxes: taxes.map((tax) => ({
        label: tax.labelSnapshot,
        ratePercent: `${(parseAmount(tax.rateSnapshot) * 100).toFixed(2)}%`,
        amount: formatXaf(tax.amount),
      })),
      lines: lines.map((line, index) => {
        const useUnits = isBottleSale && line.qtyUnits != null;
        return {
          lineNo: index + 1,
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
      })),
    },
  };
}
