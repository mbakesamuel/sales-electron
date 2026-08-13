import type { DeliveryOrderPrintPayload } from "../../shared/deliveryOrders.types.js";
import {
  formatTaxLabelFromAmounts,
  SALES_TAX_LABEL,
} from "../../shared/taxRules.js";
import { loadReportSignatory } from "../reports/companySettings.js";
import { getDatabase } from "../db/index.js";
import { parseAmount, roundMoney } from "../sales/money.js";

function sumMoney(values: Array<string | number | null | undefined>): string {
  let total = 0;
  for (const value of values) {
    total += parseAmount(String(value ?? "0"));
  }
  return roundMoney(total);
}

function paymentDetail(row: {
  kind: string;
  chequeNo: string | null;
  bank: string | null;
  cashReceiptNo: string | null;
}): string | null {
  if (row.kind === "CHEQUE" || row.kind === "TRAITE") {
    const parts = [row.chequeNo, row.bank].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  if (row.kind === "BANK_TRANSFER") {
    return row.bank?.trim() || null;
  }
  if (row.cashReceiptNo) {
    return `Receipt ${row.cashReceiptNo}`;
  }
  return null;
}

export function loadDeliveryOrderPrintById(
  orderId: number,
): DeliveryOrderPrintPayload | null {
  if (!Number.isFinite(orderId) || orderId <= 0) {
    return null;
  }

  const db = getDatabase();
  const order = db
    .prepare(
      `SELECT
         d.id,
         d.deliveryOrderNo,
         d.dateIssued,
         d.orderRef,
         d.status,
         d.issuerPhoneSnapshot,
         d.issuerAddressSnapshot,
         d.commercialServiceNameSnapshot,
         c.name AS customerName,
         c.address AS customerAddress,
         c.phone AS customerPhone,
         c.taxpayerId,
         sp.name AS salesPointName,
         createdBy.name AS createdByName,
         validatedBy.name AS validatedByName
       FROM DeliveryOrder d
       INNER JOIN Customer c ON c.id = d.customerId
       INNER JOIN SalesPoint sp ON sp.id = d.salesPointId
       LEFT JOIN User createdBy ON createdBy.id = d.createdByUserId
       LEFT JOIN User validatedBy ON validatedBy.id = d.validatedByUserId
       WHERE d.id = ?`,
    )
    .get(orderId) as
    | {
        id: number;
        deliveryOrderNo: string;
        dateIssued: string;
        orderRef: string | null;
        status: string;
        issuerPhoneSnapshot: string | null;
        issuerAddressSnapshot: string | null;
        commercialServiceNameSnapshot: string | null;
        customerName: string;
        customerAddress: string | null;
        customerPhone: string | null;
        taxpayerId: string | null;
        salesPointName: string;
        createdByName: string | null;
        validatedByName: string | null;
      }
    | undefined;

  if (!order) {
    return null;
  }

  const settings = db
    .prepare(
      `SELECT companyName, department FROM CompanySettings WHERE id = 'default'`,
    )
    .get() as
    | { companyName: string; department: string | null }
    | undefined;

  const lines = db
    .prepare(
      `SELECT
         dd.orderQty,
         dd.orderUnit,
         dd.unitPrice,
         dd.lineSubtotalExTax,
         dd.vatRate,
         dd.vatAmount,
         dd.otherTaxLabel,
         dd.otherTaxAmount,
         dd.amount,
         p.productName
       FROM DeliveryOrderDetails dd
       INNER JOIN Product p ON p.productId = dd.productId
       WHERE dd.deliveryOrderId = ?
       ORDER BY dd.id ASC`,
    )
    .all(orderId) as Array<{
    orderQty: number;
    orderUnit: string | null;
    unitPrice: string | null;
    lineSubtotalExTax: string | null;
    vatRate: string | null;
    vatAmount: string | null;
    otherTaxLabel: string | null;
    otherTaxAmount: string | null;
    amount: string | null;
    productName: string;
  }>;

  const payments = db
    .prepare(
      `SELECT
         pmd.name AS methodName,
         pmd.kind,
         dp.paymentDate,
         dp.chequeNo,
         dp.bank,
         dp.cashReceiptNo
       FROM DeliveryOrderPaymentDetails dp
       INNER JOIN PaymentMethodDefinition pmd ON pmd.id = dp.paymentMethodId
       WHERE dp.deliveryOrderId = ?
       ORDER BY dp.id ASC`,
    )
    .all(orderId) as Array<{
    methodName: string;
    kind: string;
    paymentDate: string;
    chequeNo: string | null;
    bank: string | null;
    cashReceiptNo: string | null;
  }>;

  const subtotalExTax = sumMoney(lines.map((line) => line.lineSubtotalExTax));
  const vatAmount = sumMoney(lines.map((line) => line.vatAmount));
  const otherTaxAmount = sumMoney(lines.map((line) => line.otherTaxAmount));

  const vatRate =
    lines.map((line) => line.vatRate).find((rate) => Boolean(rate?.trim())) ??
    null;

  let otherTaxLabel =
    lines.map((line) => line.otherTaxLabel).find((label) => Boolean(label?.trim())) ??
    null;

  if (parseAmount(otherTaxAmount) > 0) {
    const base = otherTaxLabel?.trim() || SALES_TAX_LABEL;
    if (!base.includes("%")) {
      otherTaxLabel = formatTaxLabelFromAmounts(
        base,
        subtotalExTax,
        otherTaxAmount,
      );
    }
  }

  const signatory = loadReportSignatory(order.dateIssued);

  return {
    companyName: settings?.companyName ?? "Sales Electron",
    department: settings?.department ?? null,
    serviceName: order.commercialServiceNameSnapshot,
    companyPhone: order.issuerPhoneSnapshot,
    companyAddress: order.issuerAddressSnapshot,
    signatoryName: signatory.name,
    signatoryTitle: signatory.title,
    order: {
      deliveryOrderNo: order.deliveryOrderNo,
      status: order.status as DeliveryOrderPrintPayload["order"]["status"],
      dateIssuedIso: order.dateIssued,
      orderRef: order.orderRef,
      salesPointName: order.salesPointName,
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      customerPhone: order.customerPhone,
      taxpayerId: order.taxpayerId,
      createdByName: order.createdByName,
      validatedByName: order.validatedByName,
      subtotalExTax,
      vatAmount,
      vatRate,
      otherTaxAmount,
      otherTaxLabel,
      grandTotal: sumMoney(lines.map((line) => line.amount)),
      lines: lines.map((line, index) => ({
        lineNo: index + 1,
        productName: line.productName,
        orderQty: String(line.orderQty ?? 0),
        orderUnit: line.orderUnit?.trim() || "kg",
        unitPrice: String(line.unitPrice ?? "0"),
        lineSubtotalExTax: String(line.lineSubtotalExTax ?? "0"),
        vatAmount: String(line.vatAmount ?? "0"),
        otherTaxAmount: String(line.otherTaxAmount ?? "0"),
        amount: String(line.amount ?? "0"),
      })),
      payments: payments.map((payment) => ({
        methodName: payment.methodName,
        paymentDate: payment.paymentDate,
        detail: paymentDetail(payment),
      })),
    },
  };
}
