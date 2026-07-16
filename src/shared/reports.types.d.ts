export interface ReportCompanySettings {
    companyName: string;
    department: string | null;
    serviceName: string | null;
    logoUrl: string | null;
}
export interface StockCommitmentReportRow {
    label: string;
    salesPointName: string | null;
    stockKg: number | null;
    commitmentKg: number | null;
    balanceKg: number | null;
    kind: "header" | "data" | "subtotal" | "total" | "grand_total";
    indent?: boolean;
}
export interface BottledPackColumn {
    id: string;
    label: string;
    units: number;
    litresPerUnit: number;
}
export interface StockCommitmentBottledSection {
    sectionNo: number;
    title: string;
    columns: BottledPackColumn[];
    unitCounts: number[];
    litres: number[];
    kgs: number[];
    totalKgs: number;
}
export interface StockCommitmentReportSection {
    sectionNo: number;
    title: string;
    rows: StockCommitmentReportRow[];
}
export interface StockCommitmentReport {
    settings: ReportCompanySettings;
    asAtIso: string;
    generatedAtIso: string;
    sections: StockCommitmentReportSection[];
    bottledSection: StockCommitmentBottledSection | null;
}
export interface StockReportLooseRow {
    salesPointName: string | null;
    storageName: string | null;
    quantityKg: number | null;
    remarks: string | null;
    kind: "data" | "subtotal" | "grand_total";
}
export interface StockReportBottledMatrixRow {
    salesPointName: string;
    unitCounts: number[];
}
export interface StockReportBottledSection {
    title: string;
    columns: BottledPackColumn[];
    rows: StockReportBottledMatrixRow[];
    columnTotals: number[];
    litres: number[];
    kgs: number[];
    totalKgs: number;
}
export interface StockReportProductMatrixRow {
    productName: string;
    quantities: number[];
}
export interface StockReportProductMatrix {
    title: string;
    salesPointNames: string[];
    rows: StockReportProductMatrixRow[];
    totals: number[];
}
export interface StockReport {
    settings: ReportCompanySettings;
    asAtIso: string;
    generatedAtIso: string;
    looseRows: StockReportLooseRow[];
    bottledSection: StockReportBottledSection | null;
    otherProductsSection: StockReportProductMatrix | null;
}
export interface CommitmentReportRow {
    label: string;
    quantities: number[];
    rowTotal: number;
    kind: "data" | "total";
}
export interface CommitmentReportSection {
    sectionLetter: string;
    title: string;
    salesPointNames: string[];
    rows: CommitmentReportRow[];
    columnTotals: number[];
    grandTotal: number;
}
export interface CommitmentReport {
    settings: ReportCompanySettings;
    asAtIso: string;
    generatedAtIso: string;
    sections: CommitmentReportSection[];
}
export interface BottleOilStockPackColumn {
    id: string;
    unitLabel: string;
    kgLabel: string;
    litresPerUnit: number;
}
export interface BottleOilStockMatrixRow {
    salesPointName: string;
    unitCounts: number[];
    kgCounts: number[];
    rowTotalUnits: number;
    rowTotalKg: number;
    kind: "data" | "total";
}
export interface BottleOilStockSection {
    title: string;
    columns: BottleOilStockPackColumn[];
    rows: BottleOilStockMatrixRow[];
    unitColumnTotals: number[];
    kgColumnTotals: number[];
    grandTotalKg: number;
}
export interface BottleOilSalesColumn {
    id: string;
    label: string;
}
export interface BottleOilSalesRow {
    label: string;
    kgs: number[];
    values: number[];
    rowTotalKg: number;
    rowTotalValue: number;
    kind: "month" | "total" | "percentage" | "value" | "value_percentage";
}
export interface BottleOilSalesSection {
    title: string;
    salesFromIso: string;
    salesToIso: string;
    columns: BottleOilSalesColumn[];
    rows: BottleOilSalesRow[];
}
export interface BottleOilStockSalesReport {
    settings: ReportCompanySettings;
    asAtIso: string;
    generatedAtIso: string;
    stockSection: BottleOilStockSection;
    salesSection: BottleOilSalesSection;
}
export interface WeeklyDeliveriesLooseRow {
    label: string;
    quantities: number[];
    rowTotal: number;
    kind: "data" | "total";
}
export interface WeeklyDeliveriesLooseSection {
    title: string;
    salesPointNames: string[];
    rows: WeeklyDeliveriesLooseRow[];
}
export interface WeeklyDeliveriesBottledColumn {
    id: string;
    label: string;
    litresPerUnit: number;
}
export interface WeeklyDeliveriesBottledSection {
    title: string;
    columns: WeeklyDeliveriesBottledColumn[];
    unitCounts: number[];
    litres: number[];
    kgs: number[];
    totalUnits: number;
    totalKgs: number;
}
export interface WeeklyDeliveriesMiscRow {
    label: string;
    quantityKg: number;
}
export interface WeeklyDeliveriesReport {
    settings: ReportCompanySettings;
    asAtIso: string;
    weekFromIso: string;
    weekToIso: string;
    generatedAtIso: string;
    looseSection: WeeklyDeliveriesLooseSection;
    bottledSection: WeeklyDeliveriesBottledSection;
    miscRows: WeeklyDeliveriesMiscRow[];
}
export interface MonthlyDeliveryCell {
    tons: number;
    value: number;
}
export interface MonthlyDeliveryRow {
    label: string;
    indent?: boolean;
    kind: "data" | "subtotal" | "total" | "avg_price";
    months: MonthlyDeliveryCell[];
    toDate: MonthlyDeliveryCell;
}
export interface MonthlyDeliveryMonthColumn {
    month: number;
    label: string;
}
export interface MonthlyDeliverySection {
    sectionNo: number;
    title: string;
    rows: MonthlyDeliveryRow[];
}
export interface MonthlyDeliveryReport {
    settings: ReportCompanySettings;
    financialYear: number;
    half: 1 | 2;
    asAtIso: string;
    generatedAtIso: string;
    reportTitle: string;
    monthColumns: MonthlyDeliveryMonthColumn[];
    sections: MonthlyDeliverySection[];
    /** Cracked / Uncracked palm kernel only (no G.TOTAL / variance in UI). */
    kernelPkBudgetSection: MonthlyDeliveryBudgetSection;
    /** Palm oil + PKO + PKC with G.TOTAL and variance. */
    budgetSection: MonthlyDeliveryBudgetSection;
}
export interface MonthlyDeliveryBudgetMetric {
    id: string;
    tonsLabel: string;
    valueLabel: string;
    estimateTons: number;
    actualTons: number;
    estimateValue: number;
    actualValue: number;
}
export interface MonthlyDeliveryBudgetSection {
    title: string;
    metrics: MonthlyDeliveryBudgetMetric[];
    grandEstimateValue: number;
    grandActualValue: number;
    variance: number;
}
/** Bottled palm oil weekly issues by payment method (Mon–Fri week). */
export type BottledWeeklyPaymentMethod = "CASH" | "CREDIT" | "PRO";
export interface BottledWeeklyDayColumn {
    id: string;
    label: string;
    isoDate: string;
}
export interface BottledWeeklyMethodMetricRow {
    kind: "kgs" | "value";
    label: string;
    /** Per weekday kg or FCFA */
    dayValues: number[];
    weekTotal: number;
    /** Packaged value column (FCFA) for the week — used on value rows; 0 on kgs */
    weekValue: number;
    monthToDateKg: number;
    monthToDateValue: number;
}
export interface BottledWeeklyMethodBlock {
    method: BottledWeeklyPaymentMethod;
    label: string;
    rows: BottledWeeklyMethodMetricRow[];
}
export interface BottledWeeklyDetailSection {
    monthLabel: string;
    dayColumns: BottledWeeklyDayColumn[];
    methods: BottledWeeklyMethodBlock[];
    totals: BottledWeeklyMethodMetricRow[];
}
export interface BottledWeeklySummaryMetric {
    kgs: number;
    value: number;
}
export interface BottledWeeklySummaryRow {
    id: "estimate" | "actual" | "pct";
    label: string;
    week: BottledWeeklySummaryMetric;
    monthToDate: BottledWeeklySummaryMetric;
    yearToDate: BottledWeeklySummaryMetric;
    averagePrice: number | null;
}
export interface BottledWeeklySummarySection {
    title: string;
    rows: BottledWeeklySummaryRow[];
}
export interface BottledWeeklyCompareColumn {
    id: string;
    label: string;
}
export interface BottledWeeklyCompareRow {
    method: BottledWeeklyPaymentMethod | "TOTAL";
    label: string;
    currentKg: number;
    currentPct: number;
    priorKg: number;
    priorPct: number;
}
export interface BottledWeeklyCompareSection {
    title: string;
    currentColumn: BottledWeeklyCompareColumn;
    priorColumn: BottledWeeklyCompareColumn;
    rows: BottledWeeklyCompareRow[];
}
export interface BottledWeeklyIssuesReport {
    settings: ReportCompanySettings;
    asAtIso: string;
    weekFromIso: string;
    weekToIso: string;
    monthFromIso: string;
    yearFromIso: string;
    generatedAtIso: string;
    reportTitle: string;
    detail: BottledWeeklyDetailSection;
    summary: BottledWeeklySummarySection;
    compare: BottledWeeklyCompareSection;
}
export interface SalesBudgetMonthlyCrosstabRow {
    productId: number;
    label: string;
    cells: number[];
    rowTotal: number;
}
export interface SalesBudgetMonthlyCrosstabReport {
    settings: ReportCompanySettings;
    yearChoices: number[];
    reportYear: number;
    hasAnyBudget: boolean;
    productsInReportCount: number;
    rows: SalesBudgetMonthlyCrosstabRow[];
    colTotals: number[];
    grandTotal: number;
    generatedAtIso: string;
}
export interface SalesBudgetWeeklyCrosstabWeekMeta {
    label: string;
    wy: number;
    wk: number;
}
export interface SalesBudgetWeeklyCrosstabProduct {
    productId: number;
    productName: string;
    productCode: string | null;
}
export interface SalesBudgetWeeklyCrosstabCellQty {
    key: string;
    qtyKg: number;
}
export interface SalesBudgetWeeklyCrosstabReport {
    settings: ReportCompanySettings;
    yearChoices: number[];
    reportYear: number;
    hasAnyBudget: boolean;
    productsInReport: SalesBudgetWeeklyCrosstabProduct[];
    sortedWeeks: SalesBudgetWeeklyCrosstabWeekMeta[];
    cols: Array<{
        productId: number;
        month: number;
    }>;
    qtyByCell: SalesBudgetWeeklyCrosstabCellQty[];
    rowTotals: number[];
    colTotals: number[];
    grandTotal: number;
    generatedAtIso: string;
}
