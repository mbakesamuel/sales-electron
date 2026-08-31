import type { AuthUser } from "../auth/session.ts";
import type { SalesApi } from "../sales/types.ts";
import type { DeliveryOrdersApi } from "../delivery-orders/types.ts";
import type { StockApi } from "../stock/types.ts";
import type {
  ConsignmentMutationResult,
  ConsignmentPrintPayload,
  LoadedConsignmentFormView,
  LoadSaleForConsignmentResult,
  SaveConsignmentNoteInput,
  SaveConsignmentNoteResult,
} from "../../shared/vehicleConsignmentNotes.types.ts";
import type {
  FinancialMonthRow,
  FinancialPeriodStatus,
  FinancialYearRow,
  OpenPostingPeriod,
  OpenYearResult,
} from "../../shared/financialYears.types.ts";
import type { DashboardSummary } from "../../shared/dashboard.types.ts";
import type {
  BottleOilStockSalesReport,
  BottledWeeklyIssuesReport,
  CommitmentReport,
  StockCommitmentReport,
  StockReport,
  MonthlyDeliveryReport,
  MonthlyStockReconciliationReport,
  MonthlyPaymentDeliveryReport,
  MonthlyDeliveriesByDestinationReport,
  MonthlyPalmOilSalesReport,
  PalmOilSalesActivityReport,
  IndustryProductMonthlySalesReport,
  BottledPalmOilSalesReturnReport,
  OtherProductSalesDeliveriesReport,
  MonthlyBottledOilReport,
  RevenueTaxesPeriod,
  RevenueTaxesReport,
  SalesBudgetMonthlyCrosstabReport,
  SalesBudgetMonthlyRevenueCrosstabReport,
  SalesBudgetWeeklyCrosstabReport,
  SalesBudgetWeeklyRevenueCrosstabReport,
  WeeklyDeliveriesReport,
  DailySalesReport,
  DailySalesMatrixReport,
  ReportSignatoryRow,
} from "../../shared/reports.types.ts";
import type {
  PermissionsApi,
  RolePermissionsSnapshot,
} from "../../shared/permissions.types.ts";

interface LoginInput {
  username: string;
  password: string;
}

interface ChangePasswordInput {
  authToken: string;
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResult {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  error?: never;
}

interface ChangePasswordErrorResult {
  error: string;
  user?: never;
  permissions?: never;
}

type ChangePasswordResponse = ChangePasswordResult | ChangePasswordErrorResult;

interface LoginResult {
  token: string;
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  error?: never;
}

interface LoginErrorResult {
  error: string;
  token?: never;
  user?: never;
  permissions?: never;
}

type LoginResponse = LoginResult | LoginErrorResult;

interface AuthSessionResponse {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
}

export interface SchemaSummary {
  tableCount: number;
  tables: string[];
}

export interface TableQueryInput {
  table: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface TableQueryResult {
  table: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
}

export interface ColumnMeta {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isRequired: boolean;
  isAutoIncrement: boolean;
  isEditableOnCreate: boolean;
  isEditableOnUpdate: boolean;
  isHidden: boolean;
  isBoolean: boolean;
  defaultValue: string | null;
  allowsNull: boolean;
}

export interface TableSchema {
  table: string;
  primaryKeyColumns: string[];
  columns: ColumnMeta[];
}

export interface TableInsertInput {
  table: string;
  values: Record<string, unknown>;
  authToken?: string;
}

export interface TableUpdateInput {
  table: string;
  primaryKey: Record<string, unknown>;
  values: Record<string, unknown>;
  authToken?: string;
}

export interface TableDeleteInput {
  table: string;
  primaryKey: Record<string, unknown>;
  authToken?: string;
}

export interface ClearOperationalDataInput {
  authToken?: string;
  /** Must be exactly `"CLEAR"`. */
  confirm: string;
}

export type ClearOperationalDataResponse =
  | {
      ok: true;
      deleted: Record<string, number>;
      sequences: Record<string, number>;
    }
  | { ok: false; error: string };

interface DatabaseApi {
  getSchemaSummary(): Promise<SchemaSummary>;
  queryTable(input: TableQueryInput): Promise<TableQueryResult>;
  getTableSchema(table: string): Promise<TableSchema>;
  insertRow(input: TableInsertInput): Promise<Record<string, unknown>>;
  updateRow(input: TableUpdateInput): Promise<Record<string, unknown>>;
  deleteRow(input: TableDeleteInput): Promise<void>;
  clearOperationalData(
    input: ClearOperationalDataInput,
  ): Promise<ClearOperationalDataResponse>;
}

interface AuthApi {
  login(data: LoginInput): Promise<LoginResponse>;
  getSession(token: string): Promise<AuthSessionResponse | null>;
  logout(token: string): Promise<void>;
  changePassword(data: ChangePasswordInput): Promise<ChangePasswordResponse>;
}

interface ReportsApi {
  getStockCommitment(authToken: string): Promise<StockCommitmentReport>;
  getStockReport(authToken: string): Promise<StockReport>;
  getCommitmentReport(authToken: string): Promise<CommitmentReport>;
  getBottleOilStockSales(authToken: string): Promise<BottleOilStockSalesReport>;
  getBottledWeeklyIssues(
    authToken: string,
    estimateBasis?: import("../../shared/reports.types").BottledWeeklyEstimateBasis,
    weekMondayIso?: string,
  ): Promise<BottledWeeklyIssuesReport>;
  getWeekChoices(authToken: string): Promise<{
    asAtIso: string;
    weekChoices: import("../../shared/reports.types").WeeklyDeliveriesWeekChoice[];
    defaultWeekMondayIso: string | null;
  }>;
  getWeeklyDeliveries(
    authToken: string,
    weekMondayIso?: string,
  ): Promise<WeeklyDeliveriesReport>;
  getMonthlyDelivery(half: 1 | 2, authToken: string): Promise<MonthlyDeliveryReport>;
  getMonthlyStockReconciliation(authToken: string): Promise<MonthlyStockReconciliationReport>;
  getMonthlyPaymentDelivery(authToken: string): Promise<MonthlyPaymentDeliveryReport>;
  getMonthlyDeliveriesByDestination(
    authToken: string,
  ): Promise<MonthlyDeliveriesByDestinationReport>;
  getMonthlyPalmOilSales(authToken: string): Promise<MonthlyPalmOilSalesReport>;
  getPalmOilSalesActivity(authToken: string): Promise<PalmOilSalesActivityReport>;
  getIndustryProductMonthlySales(
    authToken: string,
  ): Promise<IndustryProductMonthlySalesReport>;
  getBottledPalmOilSalesReturn(
    authToken: string,
  ): Promise<BottledPalmOilSalesReturnReport>;
  getOtherProductSalesDeliveries(
    authToken: string,
  ): Promise<OtherProductSalesDeliveriesReport>;
  getMonthlyBottledOil(authToken: string): Promise<MonthlyBottledOilReport>;
  getRevenueTaxes(
    authToken: string,
    period?: RevenueTaxesPeriod,
    salesPointId?: number | null,
  ): Promise<RevenueTaxesReport>;
  getSalesBudgetMonthlyCrosstab(
    authToken: string,
    reportYear?: number,
  ): Promise<SalesBudgetMonthlyCrosstabReport>;
  getSalesBudgetWeeklyCrosstab(
    authToken: string,
    reportYear?: number,
  ): Promise<SalesBudgetWeeklyCrosstabReport>;
  getSalesBudgetMonthlyRevenueCrosstab(
    authToken: string,
    reportYear?: number,
  ): Promise<SalesBudgetMonthlyRevenueCrosstabReport>;
  getSalesBudgetWeeklyRevenueCrosstab(
    authToken: string,
    reportYear?: number,
  ): Promise<SalesBudgetWeeklyRevenueCrosstabReport>;
  getDailySales(
    authToken: string,
    reportDateIso: string,
    salesPointId?: number | null,
  ): Promise<DailySalesReport>;
  getDailySalesMatrix(
    authToken: string,
    salesPointId?: number | null,
    productId?: number | null,
  ): Promise<DailySalesMatrixReport>;
  saveReportComments(
    authToken: string,
    input: { reportId: string; text: string | null },
  ): Promise<{ ok: true; comments: string | null } | { ok: false; error: string }>;
  listSignatories(authToken: string): Promise<ReportSignatoryRow[]>;
  getSignatory(
    authToken: string,
    asAtIso?: string | null,
  ): Promise<{ name: string; title: string }>;
  upsertSignatory(
    authToken: string,
    input: {
      id?: string | null;
      name: string;
      title: string;
      effectiveFrom: string;
    },
  ): Promise<{ ok: true; row: ReportSignatoryRow } | { ok: false; error: string }>;
  deleteSignatory(
    authToken: string,
    id: string,
  ): Promise<{ ok: true } | { ok: false; error: string }>;
}

interface DashboardApi {
  getSummary(authToken: string): Promise<DashboardSummary>;
}

interface FinancialYearsApi {
  listYears(authToken: string): Promise<FinancialYearRow[]>;
  openYear(authToken: string, financialYear: number): Promise<OpenYearResult>;
  closeYear(authToken: string, periodId: string): Promise<FinancialYearRow>;
  listMonthsForOpenYear(
    authToken: string,
  ): Promise<{ year: FinancialYearRow | null; months: FinancialMonthRow[] }>;
  listMonthsForPeriod(
    authToken: string,
    periodId: string,
  ): Promise<FinancialMonthRow[]>;
  setMonthStatus(
    authToken: string,
    monthId: string,
    status: FinancialPeriodStatus,
  ): Promise<FinancialMonthRow>;
  getOpenPostingPeriod(authToken: string): Promise<OpenPostingPeriod | null>;
}

interface VehicleConsignmentNotesApi {
  loadSaleByInvoice(invoiceNo: string): Promise<LoadSaleForConsignmentResult>;
  loadByVcnNo(vcnNo: string): Promise<LoadedConsignmentFormView | null>;
  save(input: SaveConsignmentNoteInput): Promise<SaveConsignmentNoteResult>;
  delete(payload: { id: string; userId: string }): Promise<ConsignmentMutationResult>;
  validate(payload: {
    id: string;
    userId: string;
  }): Promise<ConsignmentMutationResult>;
  loadPrintById(noteId: string): Promise<ConsignmentPrintPayload | null>;
  listValidationQueue(
    userId: string,
  ): Promise<
    import("../../shared/vehicleConsignmentNotes.types.ts").ConsignmentValidationQueuePage
  >;
  validateMany(payload: {
    userId: string;
    noteIds: string[];
  }): Promise<
    import("../../shared/vehicleConsignmentNotes.types.ts").ConsignmentValidateManyResult
  >;
}

export interface ElectronAppApi {
  db: DatabaseApi;
  auth: AuthApi;
  permissions: PermissionsApi;
  sales: SalesApi;
  vehicleConsignmentNotes: VehicleConsignmentNotesApi;
  deliveryOrders: DeliveryOrdersApi;
  carryForward: {
    getFormOptions(): Promise<import("../../shared/carryForward.types.ts").CarryForwardFormOptions>;
    list(): Promise<import("../../shared/carryForward.types.ts").CarryForwardCommitmentRow[]>;
    upsert(
      input: import("../../shared/carryForward.types.ts").UpsertCarryForwardInput,
    ): Promise<import("../../shared/carryForward.types.ts").CarryForwardMutationResult>;
    upsertBatch(
      input: import("../../shared/carryForward.types.ts").UpsertCarryForwardBatchInput,
    ): Promise<import("../../shared/carryForward.types.ts").CarryForwardBatchResult>;
    delete(
      input: import("../../shared/carryForward.types.ts").DeleteCarryForwardInput,
    ): Promise<import("../../shared/carryForward.types.ts").CarryForwardDeleteResult>;
  };
  carryForwardStock: {
    getFormOptions(): Promise<
      import("../../shared/carryForwardStock.types.ts").CarryForwardStockFormOptions
    >;
    list(): Promise<import("../../shared/carryForwardStock.types.ts").CarryForwardStockRow[]>;
    listOnHand(input: {
      salesPointId: number;
      productId: number;
    }): Promise<import("../../shared/carryForwardStock.types.ts").CarryForwardStockOnHandRow[]>;
    upsertBatch(
      input: import("../../shared/carryForwardStock.types.ts").UpsertCarryForwardStockBatchInput,
    ): Promise<import("../../shared/carryForwardStock.types.ts").CarryForwardStockBatchResult>;
  };
  stock: StockApi;
  reports: ReportsApi;
  dashboard: DashboardApi;
  financialYears: FinancialYearsApi;
  dialog: {
    confirm(message: string): boolean;
    alert(message: string): void;
  };
  print: {
    exportPdf(defaultFileName?: string): Promise<
      | { ok: true; filePath: string }
      | { ok: false; cancelled: true }
      | { ok: false; cancelled: false; error: string }
    >;
  };
  windows: {
    openReport(
      authToken: string,
      reportId: string,
      query?: unknown,
    ): Promise<{ ok: true } | { ok: false; error: string }>;
    onReportClosed(
      callback: (payload: { reportId: string }) => void,
    ): () => void;
  };
  reportWindow: {
    getBootstrap(
      reportId: string,
    ): Promise<{ reportId: string; authToken: string; query?: unknown } | null>;
    onBootstrap(
      callback: (payload: {
        reportId: string;
        authToken: string;
        query?: unknown;
      }) => void,
    ): () => void;
  };
}

declare global {
  interface Window {
    api: ElectronAppApi;
  }
}

export {};
