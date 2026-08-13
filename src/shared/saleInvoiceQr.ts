import type { SalePrintPayload } from "./sales.types.ts";

export const SALE_INVOICE_QR_VERSION = 1;

export interface SaleInvoiceQrPayload {
  v: typeof SALE_INVOICE_QR_VERSION;
  type: "SALE_INVOICE";
  invoiceNo: string;
  date: string;
  customer: string;
  net: string;
  gross: string;
  company: string;
  taxpayerId?: string;
}

export function buildSaleInvoiceQrText(
  sale: SalePrintPayload["sale"],
  companyName: string,
): string {
  const payload: SaleInvoiceQrPayload = {
    v: SALE_INVOICE_QR_VERSION,
    type: "SALE_INVOICE",
    invoiceNo: sale.invoiceNo,
    date: sale.dateIssuedIso.slice(0, 10),
    customer: sale.customerName,
    net: sale.netAmount,
    gross: sale.grossAmount,
    company: companyName,
  };

  const taxpayerId = sale.taxpayerId?.trim();
  if (taxpayerId) {
    payload.taxpayerId = taxpayerId;
  }

  return JSON.stringify(payload);
}
