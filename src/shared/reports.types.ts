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
  totalUnits: number;
  totalLitres: number;
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
  /** Totals for all non-bottled product sections; shown before bottled block. */
  looseGrandTotal: StockCommitmentReportRow | null;
  bottledSection: StockCommitmentBottledSection | null;
  /** Company-wide comments; null when empty (section hidden on the report). */
  comments: string | null;
}

export interface StockReportLocationRow {
  salesPointName: string | null;
  storageName: string | null;
  quantityKg: number | null;
  remarks: string | null;
  kind: "data" | "subtotal" | "grand_total";
}

export interface StockReportLocationSection {
  kind: "location_detail";
  title: string;
  productCatId: number;
  rows: StockReportLocationRow[];
  sectionTotalKg: number;
  /** When true, render oil GRAND TOTAL after this section (loose + PKO). */
  showOilGrandTotalAfter: boolean;
}

export interface StockReportBottledMatrixRow {
  salesPointName: string;
  unitCounts: number[];
}

export interface StockReportBottledSection {
  kind: "bottled";
  title: string;
  productCatId: number;
  columns: BottledPackColumn[];
  rows: StockReportBottledMatrixRow[];
  columnTotals: number[];
  litres: number[];
  kgs: number[];
  totalKgs: number;
}

export interface StockReportKernelSplitRow {
  salesPointName: string;
  crackedKg: number;
  uncrackedKg: number;
  totalKg: number;
}

export interface StockReportKernelSplitSection {
  kind: "kernel_split";
  title: string;
  productCatId: number;
  rows: StockReportKernelSplitRow[];
  totals: StockReportKernelSplitRow;
}

export interface StockReportSalesPointQtyRow {
  salesPointName: string;
  quantityKg: number;
}

export interface StockReportSalesPointQtySection {
  kind: "sales_point_qty";
  title: string;
  productCatId: number;
  quantityLabel: string;
  rows: StockReportSalesPointQtyRow[];
  totalKg: number;
}

export type StockReportSection =
  | StockReportLocationSection
  | StockReportBottledSection
  | StockReportKernelSplitSection
  | StockReportSalesPointQtySection;

export interface StockReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  generatedAtIso: string;
  sections: StockReportSection[];
  oilGrandTotalKg: number;
  comments: string | null;
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
  /** Same sales-point order as each section. */
  salesPointNames: string[];
  /** Sum of all section column totals by sales point. */
  columnTotals: number[];
  /** Sum of all section grand totals. */
  grandTotal: number;
  comments: string | null;
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
  comments: string | null;
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

export interface WeeklyDeliveriesMiscSection {
  title: string;
  rows: WeeklyDeliveriesMiscRow[];
}

export interface WeeklyDeliveriesWeekChoice {
  /** Monday of the ISO week (selection key). */
  weekMondayIso: string;
  weekFromIso: string;
  weekToIso: string;
  label: string;
}

export interface WeeklyDeliveriesReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  weekMondayIso: string;
  weekFromIso: string;
  weekToIso: string;
  weekChoices: WeeklyDeliveriesWeekChoice[];
  generatedAtIso: string;
  looseSection: WeeklyDeliveriesLooseSection;
  bottledSection: WeeklyDeliveriesBottledSection;
  miscSection: WeeklyDeliveriesMiscSection;
  comments: string | null;
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
  /** Cracked / Uncracked / P. KERNEL summary (no G.TOTAL in this table). */
  kernelPkBudgetSection: MonthlyDeliveryBudgetSection;
  /** Palm oil + PKO + PKC with G.TOTAL (includes P. KERNEL FCFA) and variance. */
  budgetSection: MonthlyDeliveryBudgetSection;
  comments: string | null;
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

/**
 * How week ESTM kg is taken from monthly phased budget
 * (same day-share idea as sales budget weekly phasing).
 */
export type BottledWeeklyEstimateBasis = "working-days" | "iso-week";

export const BOTTLED_WEEKLY_ESTIMATE_BASIS_OPTIONS: ReadonlyArray<{
  id: BottledWeeklyEstimateBasis;
  label: string;
  hint: string;
}> = [
  {
    id: "working-days",
    label: "Working days (Mon–Fri)",
    hint: "Month budget × (weekdays in report week ÷ days in month)",
  },
  {
    id: "iso-week",
    label: "Full ISO week",
    hint: "Month budget × (calendar days in ISO week ÷ days in month)",
  },
];

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
  weekMondayIso: string;
  weekFromIso: string;
  weekToIso: string;
  weekChoices: WeeklyDeliveriesWeekChoice[];
  monthFromIso: string;
  yearFromIso: string;
  generatedAtIso: string;
  reportTitle: string;
  /** Basis used for week ESTM (aligned with sales-budget day phasing). */
  estimateBasis: BottledWeeklyEstimateBasis;
  estimateBasisLabel: string;
  /** Days of the chosen week window that fall in the open month. */
  estimateWeekDaysInMonth: number;
  detail: BottledWeeklyDetailSection;
  summary: BottledWeeklySummarySection;
  compare: BottledWeeklyCompareSection;
  comments: string | null;
}

export interface SalesBudgetMonthlyCrosstabRow {
  productCatId: number;
  label: string;
  cells: number[];
  rowTotal: number;
}

export interface SalesBudgetMonthlyCrosstabReport {
  settings: ReportCompanySettings;
  yearChoices: number[];
  reportYear: number;
  hasAnyBudget: boolean;
  categoriesInReportCount: number;
  rows: SalesBudgetMonthlyCrosstabRow[];
  colTotals: number[];
  grandTotal: number;
  generatedAtIso: string;
  comments: string | null;
}

export interface SalesBudgetWeeklyCrosstabWeekMeta {
  label: string;
  wy: number;
  wk: number;
}

export interface SalesBudgetWeeklyCrosstabCategory {
  productCatId: number;
  label: string;
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
  categoriesInReport: SalesBudgetWeeklyCrosstabCategory[];
  sortedWeeks: SalesBudgetWeeklyCrosstabWeekMeta[];
  cols: Array<{ productCatId: number; month: number }>;
  qtyByCell: SalesBudgetWeeklyCrosstabCellQty[];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  generatedAtIso: string;
  comments: string | null;
}

export interface DailySalesReportLine {
  sn: number;
  customerName: string;
  deliveryOrderNo: string | null;
  dateIssuedIso: string;
  vehicleNumber: string | null;
  quantity: number;
  quantityLabel: "kg" | "unit";
  doBalance: number | null;
}

export interface DailySalesReportProductSection {
  productName: string;
  rows: DailySalesReportLine[];
  subtotalQuantity: number;
  subtotalDoBalance: number;
}

export interface DailySalesReportSummaryRow {
  id: string;
  label: string;
  quantity: number;
}

export interface DailySalesReport {
  settings: ReportCompanySettings;
  reportDateIso: string;
  selectedSalesPointId: number | null;
  salesPointLabel: string;
  generatedAtIso: string;
  sections: DailySalesReportProductSection[];
  grandTotalQuantity: number;
  grandTotalDoBalance: number;
  summaryRows: DailySalesReportSummaryRow[];
  summaryGrandTotal: number;
  salesPointOptions: Array<{ id: number; name: string }>;
  comments: string | null;
}

