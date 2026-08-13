import type { DeliveryOrderPrintPayload } from "./deliveryOrders.types.ts";

export const DELIVERY_ORDER_QR_VERSION = 1;

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

export function buildDeliveryOrderQrText(
  order: DeliveryOrderPrintPayload["order"],
  companyName: string,
): string {
  const payload: DeliveryOrderQrPayload = {
    v: DELIVERY_ORDER_QR_VERSION,
    type: "DELIVERY_ORDER",
    deliveryOrderNo: order.deliveryOrderNo,
    date: order.dateIssuedIso.slice(0, 10),
    customer: order.customerName,
    salesPoint: order.salesPointName,
    net: order.subtotalExTax,
    gross: order.grandTotal,
    company: companyName,
  };

  const taxpayerId = order.taxpayerId?.trim();
  if (taxpayerId) {
    payload.taxpayerId = taxpayerId;
  }

  return JSON.stringify(payload);
}
