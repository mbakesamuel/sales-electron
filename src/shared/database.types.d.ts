export interface SchemaSummary {
    tableCount: number;
    tables: string[];
}
import type { RolePermissionsSnapshot } from "./permissions.types.js";
export interface AuthUser {
    id: string;
    username: string;
    name: string;
    role: string;
    commercialServiceId: string | null;
    mustChangePassword: boolean;
}
export interface LoginInput {
    username: string;
    password: string;
}
export interface ChangePasswordInput {
    authToken: string;
    currentPassword: string;
    newPassword: string;
}
export interface ChangePasswordResult {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    error?: never;
}
export interface ChangePasswordErrorResult {
    error: string;
    user?: never;
    permissions?: never;
}
export type ChangePasswordResponse = ChangePasswordResult | ChangePasswordErrorResult;
export interface LoginResult {
    token: string;
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    sessionIdleTimeoutMinutes: number;
    error?: never;
}
export interface LoginErrorResult {
    error: string;
    token?: never;
    user?: never;
}
export type LoginResponse = LoginResult | LoginErrorResult;
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
export type ClearOperationalDataResponse = {
    ok: true;
    deleted: Record<string, number>;
    sequences: Record<string, number>;
} | {
    ok: false;
    error: string;
};
export interface DatabaseApi {
    getSchemaSummary(): Promise<SchemaSummary>;
    queryTable(input: TableQueryInput): Promise<TableQueryResult>;
    getTableSchema(table: string): Promise<TableSchema>;
    insertRow(input: TableInsertInput): Promise<Record<string, unknown>>;
    updateRow(input: TableUpdateInput): Promise<Record<string, unknown>>;
    deleteRow(input: TableDeleteInput): Promise<void>;
    clearOperationalData(input: ClearOperationalDataInput): Promise<ClearOperationalDataResponse>;
}
export interface AuthSessionResponse {
    user: AuthUser;
    permissions: RolePermissionsSnapshot;
    sessionIdleTimeoutMinutes: number;
}
export interface AuthApi {
    login(data: LoginInput): Promise<LoginResponse>;
    getSession(token: string): Promise<AuthSessionResponse | null>;
    logout(token: string): Promise<void>;
    changePassword(data: ChangePasswordInput): Promise<ChangePasswordResponse>;
}
export interface AppApi {
    db: DatabaseApi;
    auth: AuthApi;
    permissions: import("./permissions.types.js").PermissionsApi;
}
