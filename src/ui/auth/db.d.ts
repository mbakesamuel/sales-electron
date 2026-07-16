import type { TableDeleteInput, TableInsertInput, TableUpdateInput } from "../../shared/database.types.ts";
export declare function getAuthenticatedDb(): {
    getSchemaSummary: () => Promise<import("../types/electron").SchemaSummary>;
    queryTable: (input: import("../types/electron").TableQueryInput) => Promise<import("../types/electron").TableQueryResult>;
    getTableSchema: (table: string) => Promise<import("../types/electron").TableSchema>;
    insertRow: (input: Omit<TableInsertInput, "authToken">) => Promise<Record<string, unknown>>;
    updateRow: (input: Omit<TableUpdateInput, "authToken">) => Promise<Record<string, unknown>>;
    deleteRow: (input: Omit<TableDeleteInput, "authToken">) => Promise<void>;
};
export declare function getAuthToken(): string | null;
