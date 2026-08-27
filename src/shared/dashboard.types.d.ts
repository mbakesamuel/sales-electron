export interface DashboardDayRevenue {
    dateIso: string;
    amount: number;
}
export interface DashboardCategoryRevenue {
    categoryId: number | null;
    label: string;
    amount: number;
}
export interface DashboardProductRevenue {
    productId: number;
    label: string;
    amount: number;
}
export interface DashboardDoVsSalesMonth {
    month: number;
    label: string;
    doQtyKg: number;
    salesQtyKg: number;
}
export interface DashboardSalesQtyMonth {
    month: number;
    label: string;
    qtyUnits: number;
}
export interface DashboardOpenMonth {
    year: number;
    month: number;
    startDate: string;
    endDate: string;
    label: string;
}
export interface DashboardInvoiceCounts {
    pending: number;
    validatedOpenMonth: number;
    rejectedOpenMonth: number;
}
export interface DashboardStockOnHandRow {
    productName: string;
    qty: number;
    uom: string;
    salesPointName: string;
    storageLocationName: string;
    condition: "SELLABLE" | "UNSELLABLE";
}
interface DashboardSummaryBase {
    hasOpenPeriod: boolean;
    openMonth: DashboardOpenMonth | null;
    openYear: number | null;
    asAtIso: string;
}
/** Full commercial overview (all sales modes). */
export interface CommercialDashboardSummary extends DashboardSummaryBase {
    variant: "commercial";
    revenueByDay: DashboardDayRevenue[];
    revenueByCategory: DashboardCategoryRevenue[];
    doVsSalesByMonth: DashboardDoVsSalesMonth[];
}
/** Store Keeper overview — Bottle Oil sales + stock tiles. */
export interface BottleOilDashboardSummary extends DashboardSummaryBase {
    variant: "bottleOil";
    revenueByDay: DashboardDayRevenue[];
    revenueByProduct: DashboardProductRevenue[];
    salesQtyByMonth: DashboardSalesQtyMonth[];
    invoiceCounts: DashboardInvoiceCounts;
    stockOnHand: DashboardStockOnHandRow[];
    sellableUnitsTotal: number;
    /** DISPATCHED transfers destined for the Store Keeper's collection point. */
    pendingReceives: number;
}
export interface DashboardQueueTile {
    id: "pendingSales" | "pendingStock" | "pendingConsignment";
    label: string;
    count: number;
    routeId: string;
}
/** Senior / Junior supervisor overview — validation queues + split stock. */
export interface SupervisorDashboardSummary extends DashboardSummaryBase {
    variant: "supervisor";
    queueTiles: DashboardQueueTile[];
    revenueByDay: DashboardDayRevenue[];
    revenueByProduct: DashboardProductRevenue[];
    looseStockOnHand: DashboardStockOnHandRow[];
    bottleStockOnHand: DashboardStockOnHandRow[];
    looseSellableTotalKg: number;
    bottleSellableTotalUnits: number;
}
export type DashboardSummary = CommercialDashboardSummary | BottleOilDashboardSummary | SupervisorDashboardSummary;
export interface DashboardApi {
    getSummary(authToken: string): Promise<DashboardSummary>;
}
export {};
