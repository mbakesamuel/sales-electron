export type DeliveryOrderStatus = "PENDING" | "VALIDATED" | "REJECTED";

export type PaymentMethodKind = "SIMPLE" | "CHEQUE" | "TRAITE" | "CREDIT";

export interface DeliveryOrdersCustomerOption {
  id: number;
  name: string;
  vatApplies: boolean;
  salesTaxRate: number;
  residency: string;
  taxpayerId: string | null;
  taxRegimeKind: string | null;
}

export interface DeliveryOrdersProductOption {
  productId: number;
  productName: string;
}

export interface DeliveryOrdersSalesPointOption {
  id: number;
  name: string;
}

export interface DeliveryOrdersPaymentMethodOption {
  id: string;
  code: string;
  name: string;
  kind: PaymentMethodKind;
}

export interface DeliveryOrdersFormOptions {
  customers: DeliveryOrdersCustomerOption[];
  products: DeliveryOrdersProductOption[];
  salesPoints: DeliveryOrdersSalesPointOption[];
  paymentMethods: DeliveryOrdersPaymentMethodOption[];
  companyName: string;
  vatRateDecimal: string;
}

export interface DeliveryOrderLineInput {
  productId: number;
  orderQty: string;
  orderUnit?: string;
}

export interface DeliveryOrderPaymentInput {
  paymentMethodId: string;
  paymentDate: string;
  chequeNo?: string;
  bank?: string;
  cashReceiptNo?: string;
  receiptDate?: string;
}

export interface SaveDeliveryOrderInput {
  userId: string;
  id?: number | null;
  deliveryOrderNo?: string;
  customerId: number;
  dateIssued: string;
  orderRef?: string;
  salesPointId: number;
  lines: DeliveryOrderLineInput[];
  payments: DeliveryOrderPaymentInput[];
}

export type SaveDeliveryOrderResult =
  | { ok: true; id: number; deliveryOrderNo: string }
  | { ok: false; error: string };

export type DeliveryOrderMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export interface DeliveryOrderTaxPreview {
  vatRate: string;
  vatPercentLabel: string;
  otherRate: string;
  otherPercentLabel: string;
  otherLabel: string | null;
}

export type TaxPreviewResult =
  | { ok: true; preview: DeliveryOrderTaxPreview }
  | { ok: false; error: string };

export type UnitPricePreviewResult =
  | { ok: true; unitPriceExTax: string }
  | { ok: false; error: string };

export type StockOnHandPreviewResult =
  | { ok: true; onHand: string }
  | { ok: false; error: string };

export interface LoadedDeliveryOrderLine {
  productId: number;
  productName: string;
  orderQty: number;
  orderUnit: string;
  unitPrice: string;
  lineSubtotalExTax: string;
  vatAmount: string;
  otherTaxAmount: string;
  amount: string;
}

export interface LoadedDeliveryOrderPayment {
  paymentMethodId: string;
  methodCode: string;
  methodName: string;
  kind: PaymentMethodKind;
  paymentDate: string;
  chequeNo: string;
  bank: string;
  cashReceiptNo: string;
  receiptDate: string;
}

export interface LoadedDeliveryOrderView {
  id: number;
  deliveryOrderNo: string;
  customerId: number;
  customerName: string;
  vatApplies: boolean;
  dateIssued: string;
  orderRef: string | null;
  salesPointId: number;
  salesPointName: string;
  status: DeliveryOrderStatus;
  createdByName: string | null;
  validatedByName: string | null;
  validatedAtIso: string | null;
  lines: LoadedDeliveryOrderLine[];
  payments: LoadedDeliveryOrderPayment[];
}

export interface PendingDeliveryOrderRow {
  deliveryOrderNo: string;
  dateIssued: string;
  customerName: string;
  totalLabel: string;
}

export type DeliveryOrdersListPeriod = "month" | "year" | "all";

export interface DeliveryOrdersListFilters {
  q?: string;
  period?: DeliveryOrdersListPeriod;
  /** When set, only DOs for this sales point. Null/undefined = all. */
  salesPointId?: number | null;
}

export interface DeliveryOrdersListRow {
  id: number;
  deliveryOrderNo: string;
  dateIssuedIso: string;
  salesPointName: string;
  customerName: string;
  productSummary: string;
  status: DeliveryOrderStatus;
  totalQtyLabel: string;
  totalAmountXaf: string;
}

export interface DeliveryOrdersListResult {
  rows: DeliveryOrdersListRow[];
  totals: {
    count: number;
    totalQtyLabel: string;
    totalAmountXaf: string;
  };
  periodLabel: string;
}

export interface ValidationQueueRow {
  id: number;
  deliveryOrderNo: string;
  dateIssuedIso: string;
  salesPointName: string;
  customerName: string;
  totalAmountXaf: string;
}

export interface ValidationQueuePage {
  rows: ValidationQueueRow[];
  totalPending: number;
}

export interface DeliveryOrdersApi {
  getFormOptions(): Promise<DeliveryOrdersFormOptions>;
  loadByNo(deliveryOrderNo: string): Promise<LoadedDeliveryOrderView | null>;
  listPending(): Promise<PendingDeliveryOrderRow[]>;
  listOrders(filters?: DeliveryOrdersListFilters): Promise<DeliveryOrdersListResult>;
  save(input: SaveDeliveryOrderInput): Promise<SaveDeliveryOrderResult>;
  deleteOrder(orderId: number): Promise<DeliveryOrderMutationResult>;
  validateOrder(payload: { orderId: number; userId: string }): Promise<DeliveryOrderMutationResult>;
  cancelValidated(payload: {
    orderId: number;
    userId: string;
    reason: string;
  }): Promise<DeliveryOrderMutationResult>;
  previewTaxes(payload: {
    customerId: number;
    dateIssued: string;
  }): Promise<TaxPreviewResult>;
  previewUnitPrice(payload: {
    customerId: number;
    productId: number;
    dateIssued: string;
  }): Promise<UnitPricePreviewResult>;
  previewStockOnHand(payload: {
    salesPointId: number;
    productId: number;
  }): Promise<StockOnHandPreviewResult>;
  listValidationQueue(): Promise<ValidationQueuePage>;
  validateMany(payload: {
    orderIds: number[];
    userId: string;
  }): Promise<
    | { ok: true; validated: number; errors: Array<{ id: number; error: string }> }
    | { ok: false; error: string }
  >;
}
