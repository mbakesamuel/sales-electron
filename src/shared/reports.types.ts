export interface ReportCompanySettings {
  companyName: string;
  department: string | null;
  serviceName: string | null;
  logoUrl: string | null;
  /** Resolved report footer signatory name for the report as-at date. */
  signatoryName: string | null;
  /** Role/title under the signatory name. */
  signatoryTitle: string;
}

export interface ReportSignatoryRow {
  id: string;
  name: string;
  title: string;
  /** YYYY-MM-DD */
  effectiveFrom: string;
  createdAt: string;
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

export type MonthlyStockReconciliationRowKind =
  | "data"
  | "section_header"
  | "total"
  | "subtotal"
  | "blank";

/** Matrix row keyed by sales-point id string; null cells render as em dash. */
export interface MonthlyStockReconciliationMatrixRow {
  label: string;
  kind: MonthlyStockReconciliationRowKind;
  valuesBySalesPointId: Record<string, number | null>;
  total: number | null;
}

export interface MonthlyStockReconciliationReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  monthStartIso: string;
  monthLabel: string;
  reportTitle: string;
  generatedAtIso: string;
  salesPointIds: number[];
  salesPointNames: string[];
  openingRow: MonthlyStockReconciliationMatrixRow;
  receptionSectionTitle: string;
  receptionRows: MonthlyStockReconciliationMatrixRow[];
  totalReceptionRow: MonthlyStockReconciliationMatrixRow;
  openingPlusReceptionRow: MonthlyStockReconciliationMatrixRow;
  issuesSectionTitle: string;
  issueRows: MonthlyStockReconciliationMatrixRow[];
  totalIssuesRow: MonthlyStockReconciliationMatrixRow;
  calculatedStockRow: MonthlyStockReconciliationMatrixRow;
  physicalStockRow: MonthlyStockReconciliationMatrixRow;
  varianceRow: MonthlyStockReconciliationMatrixRow;
  bpoSectionTitle: string;
  bpoRows: MonthlyStockReconciliationMatrixRow[];
  otherSectionTitle: string;
  otherRows: MonthlyStockReconciliationMatrixRow[];
  comments: string | null;
}

export interface MonthlyPaymentDeliveryWeekRow {
  weekIndex: number;
  weekFromIso: string;
  weekToIso: string;
  /** Compact day range within the month, e.g. "1-4" or "5-11". */
  datesLabel: string;
  paymentsKg: number;
  paymentsValue: number;
  deliveriesKg: number;
  deliveriesValue: number;
}

export interface MonthlyPaymentDeliveryTotals {
  paymentsKg: number;
  paymentsValue: number;
  deliveriesKg: number;
  deliveriesValue: number;
}

export interface MonthlyPaymentDeliveryReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  monthStartIso: string;
  monthEndIso: string;
  monthName: string;
  financialYear: number;
  reportTitle: string;
  generatedAtIso: string;
  weeks: MonthlyPaymentDeliveryWeekRow[];
  totals: MonthlyPaymentDeliveryTotals;
  comments: string | null;
}

export interface MonthlyDeliveriesByDestinationKgRow {
  industriesKg: number;
  wholesalesKg: number;
  retailKg: number;
  cdcWorkersKg: number;
  makokoKg: number;
  totalKg: number;
}

export interface MonthlyDeliveriesByDestinationWeekRow extends MonthlyDeliveriesByDestinationKgRow {
  weekIndex: number;
  weekFromIso: string;
  weekToIso: string;
  /** Compact day range within the month, e.g. "1-4" or "5-11". */
  datesLabel: string;
}

export interface MonthlyDeliveriesByDestinationPercentages {
  industriesPct: number | null;
  wholesalesPct: number | null;
  retailPct: number | null;
  cdcWorkersPct: number | null;
  makokoPct: number | null;
  totalPct: number | null;
}

export interface MonthlyDeliveriesByDestinationReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  monthStartIso: string;
  monthEndIso: string;
  monthName: string;
  financialYear: number;
  reportTitle: string;
  generatedAtIso: string;
  weeks: MonthlyDeliveriesByDestinationWeekRow[];
  totals: MonthlyDeliveriesByDestinationKgRow;
  percentages: MonthlyDeliveriesByDestinationPercentages;
  comments: string | null;
}

export interface MonthlyPalmOilSalesCell {
  tons: number;
  /** Full FCFA (tax-excluded line net); UI divides by 1000 for '000 FRS. */
  value: number;
}

export interface MonthlyPalmOilSalesMonthColumn {
  /** Calendar month 1–12. */
  month: number;
  label: string;
}

export type MonthlyPalmOilSalesRowKind =
  | "section"
  | "data"
  | "subtotal"
  | "total";

export interface MonthlyPalmOilSalesRow {
  id: string;
  label: string;
  kind: MonthlyPalmOilSalesRowKind;
  /** Twelve calendar-month cells (Jan=0 … Dec=11). */
  months: MonthlyPalmOilSalesCell[];
  ytd: MonthlyPalmOilSalesCell;
}

export interface MonthlyPalmOilSalesReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  monthName: string;
  financialYear: number;
  reportTitle: string;
  generatedAtIso: string;
  monthColumnsH1: MonthlyPalmOilSalesMonthColumn[];
  monthColumnsH2: MonthlyPalmOilSalesMonthColumn[];
  rows: MonthlyPalmOilSalesRow[];
  comments: string | null;
}

export type RevenueTaxesPeriod = "month" | "year";

export interface RevenueTaxesTotals {
  invoiceCount: number;
  netAmount: number;
  vatAmount: number;
  salesTaxAmount: number;
  grossAmount: number;
}

export interface RevenueTaxesBucketRow extends RevenueTaxesTotals {
  key: string;
  label: string;
}

export interface RevenueTaxesSalesPointOption {
  id: number;
  name: string;
}

export interface RevenueTaxesReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  period: RevenueTaxesPeriod;
  periodLabel: string;
  fromIso: string;
  toIso: string;
  monthName: string;
  financialYear: number;
  salesPointId: number | null;
  salesPointLabel: string;
  salesPointOptions: RevenueTaxesSalesPointOption[];
  reportTitle: string;
  generatedAtIso: string;
  totals: RevenueTaxesTotals;
  /** By calendar day (month mode) or calendar month (FY mode). */
  byPeriod: RevenueTaxesBucketRow[];
  bySalesPoint: RevenueTaxesBucketRow[];
  comments: string | null;
}

export interface IndustryProductMonthlySalesCell {
  tons: number;
  /** Full FCFA (tax-excluded line net); UI divides by 1000 for '000 FRS. */
  value: number;
}

export interface IndustryProductMonthlySalesMonthColumn {
  /** Calendar month 1–12. */
  month: number;
  label: string;
}

export type IndustryProductMonthlySalesRowKind = "data" | "total";

export interface IndustryProductMonthlySalesRow {
  id: string;
  label: string;
  kind: IndustryProductMonthlySalesRowKind;
  /** Twelve calendar-month cells (Jan=0 … Dec=11). */
  months: IndustryProductMonthlySalesCell[];
  ytd: IndustryProductMonthlySalesCell;
}

export interface IndustryProductMonthlySalesSection {
  productId: number;
  productName: string;
  sectionTitle: string;
  salesPointRows: IndustryProductMonthlySalesRow[];
  totalRow: IndustryProductMonthlySalesRow;
}

export interface IndustryProductMonthlySalesReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  monthName: string;
  financialYear: number;
  reportTitle: string;
  customerCategoryLabel: string;
  generatedAtIso: string;
  monthColumnsH1: IndustryProductMonthlySalesMonthColumn[];
  monthColumnsH2: IndustryProductMonthlySalesMonthColumn[];
  sections: IndustryProductMonthlySalesSection[];
  comments: string | null;
}

export type BottledPalmOilSalesReturnPackId = "jug20" | "carton5" | "carton15";

export interface BottledPalmOilSalesReturnPackColumn {
  id: BottledPalmOilSalesReturnPackId;
  label: string;
  litresPerUnit: number;
}

export interface BottledPalmOilSalesReturnCell {
  qty: number;
  /** Tax-excluded FCFA; 0 when the row does not carry amounts. */
  amount: number;
}

export type BottledPalmOilSalesReturnRowKind =
  | "bf"
  | "reception"
  | "totalStock"
  | "section"
  | "cashSales"
  | "publicRelation"
  | "totalIssues"
  | "issuesLitres"
  | "issuesKg"
  | "balance"
  | "balanceLitres"
  | "balanceKg";

export interface BottledPalmOilSalesReturnRow {
  id: string;
  label: string;
  kind: BottledPalmOilSalesReturnRowKind;
  /** Pack cells in packColumns order. Empty for section rows. */
  packs: BottledPalmOilSalesReturnCell[];
  totalKg: number;
  grandTotalFcfa: number;
}

export interface BottledPalmOilSalesReturnReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  monthStartIso: string;
  monthName: string;
  financialYear: number;
  reportTitle: string;
  generatedAtIso: string;
  packColumns: BottledPalmOilSalesReturnPackColumn[];
  rows: BottledPalmOilSalesReturnRow[];
  comments: string | null;
}

export interface OtherProductSalesDeliveriesMetrics {
  paymentsKg: number;
  paymentsValue: number;
  deliveriesKg: number;
  deliveriesValue: number;
}

export type OtherProductSalesDeliveriesRowKind = "product" | "subtotal" | "grandTotal";

export interface OtherProductSalesDeliveriesRow extends OtherProductSalesDeliveriesMetrics {
  id: string;
  kind: OtherProductSalesDeliveriesRowKind;
  /** Sales point label; blank on continuation product rows when UI uses rowspan. */
  salesPointLabel: string;
  productLabel: string;
  productId: number | null;
}

export interface OtherProductSalesDeliveriesSection {
  salesPointId: number | null;
  salesPointName: string;
  productRows: OtherProductSalesDeliveriesRow[];
  subtotal: OtherProductSalesDeliveriesRow;
}

export interface OtherProductSalesDeliveriesReport {
  settings: ReportCompanySettings;
  asAtIso: string;
  monthStartIso: string;
  monthName: string;
  financialYear: number;
  reportTitle: string;
  generatedAtIso: string;
  sections: OtherProductSalesDeliveriesSection[];
  grandTotal: OtherProductSalesDeliveriesRow;
  comments: string | null;
}

