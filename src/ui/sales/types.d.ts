export type SaleStatus = "PENDING" | "VALIDATED" | "REJECTED";
export type PaymentMethodKind = "SIMPLE" | "CHEQUE" | "TRAITE" | "CREDIT" | "BANK_TRANSFER";
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
    salesTaxExempt: boolean;
    salesTaxRate: number;
}
export interface SalesProductOption {
    productId: number;
    productName: string;
    productCat: string;
    /** ProductCat.productCode — used for storage-location exceptions (PKCP/PKP). */
    productCatCode: string;
    /** ProductCat.isMain — Loose Palm Oil category. */
    isMain: boolean;
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
    isSalesTank: boolean;
}
/** Storage locations with live SELLABLE on-hand for a product at a sales point. */
export interface SalesStorageLocationBalanceOption {
    id: number;
    name: string;
    qty: number;
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
    canDirectValidate: boolean;
    canDirectValidateLoose: boolean;
    canDirectValidateBottled: boolean;
    /** Company setting: Bottle Oil invoices use directory customers when true. */
    bottleOilUseRegisteredCustomers: boolean;
    /** Company setting: Bottle Oil invoices may use Ration disposition when true. */
    bottleOilAllowRation: boolean;
    /** Company setting: loose Sales Invoicing may use Public relation when true. */
    looseSalesAllowPublicRelation: boolean;
    /** Company setting: loose normal invoices may use invoice-name-only customers when true. */
    looseSalesAllowUnregisteredCustomer: boolean;
    /** Company setting: Loose Palm Oil must use a sales tank when true (default). */
    loosePalmOilRequireSalesTank: boolean;
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
    invoiceNo: string;
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
    validateImmediately?: boolean;
}
export type SaveSaleResult = {
    ok: true;
    saleId: string;
    invoiceNo: string;
} | {
    ok: false;
    error: string;
};
export type SaleMutationResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
export type UnitPricePreviewResult = {
    ok: true;
    unitPriceExTax: string;
} | {
    ok: false;
    error: string;
};
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
export interface SalesValidationQueueRow {
    id: string;
    invoiceNo: string;
    soldAtIso: string;
    dateIssuedIso: string;
    customerName: string;
    salesPointName: string | null;
    createdByName: string;
    saleProductMode: SaleProductMode | null;
    totalLabel: string;
    lineCount: number;
}
export interface SalesValidationQueuePage {
    totalPending: number;
    rows: SalesValidationQueueRow[];
}
export type SalesValidateManyResult = {
    ok: true;
    validated: number;
    errors: Array<{
        id: string;
        invoiceNo?: string;
        error: string;
    }>;
} | {
    ok: false;
    error: string;
};
export interface AvailableDeliveryOrderRow {
    deliveryOrderNo: string;
    customerName: string;
    dateIssued: string;
    productId: number;
    productName: string;
    /** Remaining kg for this product only (not DO total). */
    balanceKg: string;
    isCarryForward?: boolean;
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
    productCode: string | null;
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
    serviceName: string | null;
    companyPhone: string | null;
    companyAddress: string | null;
    logoUrl: string | null;
    signatoryName: string;
    signatoryTitle: string;
    sale: {
        invoiceNo: string;
        status: string;
        soldAtIso: string;
        vehicleNumber: string;
        dateIssuedIso: string;
        deliveryOrderNo: string | null;
        referenceNumber: string | null;
        customerName: string;
        customerAddress: string | null;
        customerPhone: string | null;
        taxpayerId: string | null;
        salespersonName: string | null;
        salesPointName: string | null;
        saleProductMode: string | null;
        saleDisposition: string | null;
        netAmount: string;
        vatAmount: string;
        grossAmount: string;
        appliedTaxes: Array<{
            label: string;
            ratePercent: string;
            amount: string;
        }>;
        lines: SalePrintLine[];
        payments: Array<{
            methodName: string;
            amount: string;
            paymentDate: string | null;
        }>;
    };
}
export type SalesListPeriod = "month" | "year" | "all";
export interface SalesListFilters {
    q?: string;
    period?: SalesListPeriod;
    productMode?: SaleProductMode;
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
    getFormOptions(userId: string): Promise<SalesFormOptions>;
    getTaxRatesAsOf(asOfDate: string): Promise<import("../../shared/taxRules.ts").TaxRatesBag>;
    listSales(filters?: SalesListFilters): Promise<SalesListResult>;
    listPendingSales(): Promise<PendingSaleRow[]>;
    listValidationQueue(userId: string): Promise<SalesValidationQueuePage>;
    validateMany(payload: {
        userId: string;
        saleIds: string[];
    }): Promise<SalesValidateManyResult>;
    loadSaleByInvoiceNo(invoiceNo: string): Promise<LoadedSaleView | null>;
    createSale(input: CreateSaleInput): Promise<SaveSaleResult>;
    validateSale(payload: {
        saleId: string;
        userId: string;
    }): Promise<SaleMutationResult>;
    deleteSale(payload: {
        saleId: string;
        userId: string;
    }): Promise<SaleMutationResult>;
    listAvailableDeliveryOrders(payload: {
        salesPointId: number;
        customerId: number;
    }): Promise<AvailableDeliveryOrderRow[]>;
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
    listStorageLocationsWithBalance(payload: {
        salesPointId: number;
        productId: number;
        asOfDate?: string | null;
    }): Promise<SalesStorageLocationBalanceOption[]>;
}
