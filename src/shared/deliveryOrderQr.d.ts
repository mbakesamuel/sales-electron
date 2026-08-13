import type { DeliveryOrderPrintPayload } from "./deliveryOrders.types.ts";
export declare const DELIVERY_ORDER_QR_VERSION = 1;
export interface DeliveryOrderQrPayload {
    v: typeof DELIVERY_ORDER_QR_VERSION;
    type: "DELIVERY_ORDER";
    deliveryOrderNo: string;
    date: string;
    customer: string;
    salesPoint: string;
    net: string;
    gross: string;
    company: string;
    taxpayerId?: string;
}
export declare function buildDeliveryOrderQrText(order: DeliveryOrderPrintPayload["order"], companyName: string): string;
