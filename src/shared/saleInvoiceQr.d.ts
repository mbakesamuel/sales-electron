import type { SalePrintPayload } from "./sales.types.ts";
export declare const SALE_INVOICE_QR_VERSION = 1;
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
export declare function buildSaleInvoiceQrText(sale: SalePrintPayload["sale"], companyName: string): string;
