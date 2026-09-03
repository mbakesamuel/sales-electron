import type { OpenPostingPeriod } from "./financialYears.types.js";
export interface TransportRateScheduleRow {
    id: string;
    salesPointId: number;
    salesPointName: string;
    productId: number;
    productName: string;
    productCode: string;
    ratePerKg: string;
    ratePerKgNumeric: number;
    effectiveFrom: string;
    createdAt: string;
    updatedAt: string;
    raw: Record<string, unknown>;
}
export interface TransportCostProductOption {
    productId: number;
    productName: string;
    productCode: string;
}
export interface TransportCostSalesPointOption {
    id: number;
    name: string;
}
export interface TransportCostCustomerOption {
    id: number;
    name: string;
}
export interface TransportCostFormOptions {
    customers: TransportCostCustomerOption[];
    salesPoints: TransportCostSalesPointOption[];
    products: TransportCostProductOption[];
    openPeriod: OpenPostingPeriod | null;
    transportCostMoliweOnlyPolicy: boolean;
    policyNotice: string | null;
}
export interface TransportCostComputeInput {
    customerId: number;
    salesPointId: number;
    productId: number;
}
export interface TransportCostComputeLine {
    dateIssued: string;
    invoiceNo: string | null;
    deliveryOrderNo: string | null;
    qtyKg: number;
    ratePerKg: number | null;
    lineCost: number | null;
    rateMissing: boolean;
}
export interface TransportCostComputeResult {
    period: OpenPostingPeriod;
    asAtIso: string;
    customerId: number;
    customerName: string;
    salesPointId: number;
    salesPointName: string;
    productId: number;
    productName: string;
    lines: TransportCostComputeLine[];
    totalQtyKg: number;
    totalCost: number;
    warnings: string[];
}
