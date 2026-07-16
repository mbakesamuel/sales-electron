export type SaleStatus = "PENDING" | "VALIDATED" | "REJECTED";

export type PaymentMethodKind = "SIMPLE" | "CHEQUE" | "TRAITE" | "CREDIT";

export type SaleProductMode = "LOOSE" | "BOTTLE";

export type SaleDisposition = "NORMAL" | "RATION" | "PUBLIC_RELATION";

export interface SalesCustomerOption {
  id: number;
  name: string;
  taxRegimeId: string | null;
  taxRegimeName: string | null;
  taxRegimeKind: string | null;
  residency: string;
  taxpayerId: string | null;
  vatApplies: boolean;
  salesTaxRate: number;
}

export interface SalesProductOption {
  productId: number;
  productName: string;
  productCat: string;
}

export interface SalesPaymentMethodOption {
  id: string;
  code: string;
  name: string;
  kind: PaymentMethodKind;
}

export interface SalesPointOption {
  id: number;
  name: string;
}

export interface StorageLocationOption {
  id: number;
  salesPointId: number;
  name: string;
  isDefault: boolean;
}

export interface SalesFormOptions {
  customers: SalesCustomerOption[];
  looseProducts: SalesProductOption[];
  bottledProducts: SalesProductOption[];
  paymentMethods: SalesPaymentMethodOption[];
  salesPoints: SalesPointOption[];
  storageLocations: StorageLocationOption[];
  vatRateDecimal: string;
  companyName: string;
  botaSalesPointId: number | null;
  bottleOilStoreLocationId: number | null;
  invoiceOnlyTaxRegimeId: string | null;
}

export interface SaleLineInput {
  productId: number;
  qtyKg: string;
  qtyUnits?: string;
  unitPricePerKg: string;
  unitPricePerUnit?: string;
  storageLocationId?: number | null;
}

export interface SalePaymentInput {
  paymentMethodId: string;
  amount: string;
  chequeNo?: string;
  bank?: string;
  traiteNo?: string;
  traiteIssuedOn?: string;
  traiteMaturityOn?: string;
}

export interface CreateSaleInput {
  userId: string;
  customerId?: number | null;
  customerNameOverride?: string;
  salesPointId?: number | null;
  vehicleNumber: string;
  dateIssued: string;
  referenceNumber?: string;
  deliveryOrderNo?: string;
  saleProductMode?: SaleProductMode;
  saleDisposition?: SaleDisposition;
  lines: SaleLineInput[];
  payments: SalePaymentInput[];
}

export type SaveSaleResult =
  | { ok: true; saleId: string; invoiceNo: string }
  | { ok: false; error: string };

export type SaleMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export type UnitPricePreviewResult =
  | { ok: true; unitPriceExTax: string }
  | { ok: false; error: string };

export interface LoadedSaleLine {
  productId: number;
  productName: string;
  productCat: string;
  storageLocationId: number | null;
  qtyKg: string;
  qtyUnits: string | null;
  unitPricePerKg: string;
  unitPricePerUnit: string | null;
  lineNet: string;
  lineVat: string;
  lineGross: string;
}

export interface LoadedSalePayment {
  paymentMethodId: string;
  methodCode: string;
  methodName: string;
  kind: PaymentMethodKind;
  amount: string;
  chequeNo: string | null;
  bank: string | null;
  traiteNo: string | null;
  traiteIssuedOn: string | null;
  traiteMaturityOn: string | null;
  paidAtIso: string;
}

export interface LoadedSaleView {
  id: string;
  invoiceNo: string;
  soldAtIso: string;
  referenceNumber: string | null;
  salesPointId: number | null;
  salesPointName: string | null;
  customerId: number | null;
  customerName: string;
  createdByUserId: string;
  createdByName: string;
  status: SaleStatus;
  validatedAtIso: string | null;
  validatedByName: string | null;
  vehicleNumber: string;
  dateIssuedIso: string;
  deliveryOrderNo: string | null;
  saleProductMode: SaleProductMode | null;
  saleDisposition: SaleDisposition | null;
  netAmount: string;
  vatAmount: string;
  grossAmount: string;
  lines: LoadedSaleLine[];
  payments: LoadedSalePayment[];
}

export interface PendingSaleRow {
  invoiceNo: string;
  soldAtIso: string;
  customerName: string;
  totalLabel: string;
  salesPointName: string | null;
}

export interface AvailableDeliveryOrderRow {
  deliveryOrderNo: string;
  customerName: string;
  dateIssued: string;
  balanceKg: string;
}

export interface DeliveryOrderProductRow {
  productId: number;
  productName: string;
  orderQty: string;
  soldQty: string;
  balanceQty: string;
  unitPrice: string;
}

export interface DeliveryOrderLookupResult {
  deliveryOrderNo: string;
  dateIssued: string;
  customerId: number;
  customerName: string;
  customerMatches: boolean;
  balanceKg: string;
  perProduct: DeliveryOrderProductRow[];
}

export interface SalePrintLine {
  lineNo: number;
  productName: string;
  productCat: string;
  qty: string;
  unitLabel: string;
  unitPrice: string;
  lineNet: string;
}

export interface SalePrintPayload {
  companyName: string;
  department: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  logoUrl: string | null;
  sale: {
    invoiceNo: string;
    status: string;
    soldAtIso: string;
    vehicleNumber: string;
    dateIssuedIso: string;
    deliveryOrderNo: string | null;
    referenceNumber: string | null;
    customerName: string;
    taxpayerId: string | null;
    saleProductMode: string | null;
    saleDisposition: string | null;
    netAmount: string;
    vatAmount: string;
    grossAmount: string;
    appliedTaxes: Array<{ label: string; ratePercent: string; amount: string }>;
    lines: SalePrintLine[];
    payments: Array<{ methodName: string; amount: string }>;
  };
}

export type SalesListPeriod = "month" | "year" | "all";

export interface SalesListFilters {
  q?: string;
  period?: SalesListPeriod;
}

export interface SalesListRow {
  id: string;
  invoiceNo: string;
  soldAtIso: string;
  salesPointName: string;
  deliveryOrderNo: string | null;
  customerName: string;
  productSummary: string;
  status: SaleStatus;
  totalQtyLabel: string;
  totalAmountXaf: string;
}

export interface SalesListResult {
  rows: SalesListRow[];
  totals: {
    count: number;
    totalQtyLabel: string;
    totalAmountXaf: string;
  };
  periodLabel: string;
}

export interface SalesApi {
  getFormOptions(): Promise<SalesFormOptions>;
  getTaxRatesAsOf(asOfDate: string): Promise<import("./taxRules.ts").TaxRatesBag>;
  listSales(filters?: SalesListFilters): Promise<SalesListResult>;
  listPendingSales(): Promise<PendingSaleRow[]>;
  loadSaleByInvoiceNo(invoiceNo: string): Promise<LoadedSaleView | null>;
  createSale(input: CreateSaleInput): Promise<SaveSaleResult>;
  validateSale(payload: { saleId: string; userId: string }): Promise<SaleMutationResult>;
  deleteSale(saleId: string): Promise<SaleMutationResult>;
  listAvailableDeliveryOrders(salesPointId: number): Promise<AvailableDeliveryOrderRow[]>;
  lookupDeliveryOrder(payload: {
    deliveryOrderNo: string;
    salesPointId: number;
    customerId: number;
  }): Promise<DeliveryOrderLookupResult | null>;
  loadSalePrintById(saleId: string): Promise<SalePrintPayload | null>;
  previewUnitPrice(payload: {
    productId: number;
    asOfDate: string;
    customerId?: number | null;
  }): Promise<UnitPricePreviewResult>;
}
