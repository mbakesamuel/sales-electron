import type { AuthUser } from "../auth/session.ts";
import type { SalesApi } from "../sales/types.ts";
import type { DeliveryOrdersApi } from "../delivery-orders/types.ts";
import type { StockApi } from "../stock/types.ts";
import type {
  FinancialMonthRow,
  FinancialPeriodStatus,
  FinancialYearRow,
  OpenPostingPeriod,
  OpenYearResult,
} from "../../shared/financialYears.types.ts";
import type {
  BottleOilStockSalesReport,
  BottledWeeklyIssuesReport,
  CommitmentReport,
  StockCommitmentReport,
  StockReport,
  MonthlyDeliveryReport,
  SalesBudgetMonthlyCrosstabReport,
  SalesBudgetWeeklyCrosstabReport,
  WeeklyDeliveriesReport,
} from "../../shared/reports.types.ts";
import type {
  PermissionsApi,
  RolePermissionsSnapshot,
} from "../../shared/permissions.types.ts";

interface LoginInput {
  username: string;
  password: string;
}

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

interface DatabaseApi {
  getSchemaSummary(): Promise<SchemaSummary>;
  queryTable(input: TableQueryInput): Promise<TableQueryResult>;
  getTableSchema(table: string): Promise<TableSchema>;
  insertRow(input: TableInsertInput): Promise<Record<string, unknown>>;
  updateRow(input: TableUpdateInput): Promise<Record<string, unknown>>;
  deleteRow(input: TableDeleteInput): Promise<void>;
}

interface AuthApi {
  login(data: LoginInput): Promise<LoginResponse>;
  getSession(token: string): Promise<AuthSessionResponse | null>;
  logout(token: string): Promise<void>;
}

interface ReportsApi {
  getStockCommitment(authToken: string): Promise<StockCommitmentReport>;
  getStockReport(authToken: string): Promise<StockReport>;
  getCommitmentReport(authToken: string): Promise<CommitmentReport>;
  getBottleOilStockSales(authToken: string): Promise<BottleOilStockSalesReport>;
  getBottledWeeklyIssues(
    authToken: string,
    estimateBasis?: import("../../shared/reports.types").BottledWeeklyEstimateBasis,
  ): Promise<BottledWeeklyIssuesReport>;
  getWeeklyDeliveries(authToken: string): Promise<WeeklyDeliveriesReport>;
  getMonthlyDelivery(half: 1 | 2, authToken: string): Promise<MonthlyDeliveryReport>;
  getSalesBudgetMonthlyCrosstab(
    authToken: string,
    reportYear?: number,
  ): Promise<SalesBudgetMonthlyCrosstabReport>;
  getSalesBudgetWeeklyCrosstab(
    authToken: string,
    reportYear?: number,
  ): Promise<SalesBudgetWeeklyCrosstabReport>;
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

export interface ElectronAppApi {
  db: DatabaseApi;
  auth: AuthApi;
  permissions: PermissionsApi;
  sales: SalesApi;
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
  stock: StockApi;
  reports: ReportsApi;
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
}

declare global {
  interface Window {
    api: ElectronAppApi;
  }
}

export {};
