import { hashPassword } from "../auth/password.js";
import type {
  TableDeleteInput,
  TableInsertInput,
  TableSchema,
  TableUpdateInput,
} from "../../shared/database.types.js";
import { syncCompanyVatRateFromSchedule } from "../tax/resolveRates.js";
import { assertBudgetYear } from "../financialYears/service.js";
import { getDatabase } from "./index.js";
import {
  assertMutableTable,
  buildTableSchema,
  createTextPrimaryKey,
  extractPrimaryKey,
  normalizeDefaultValue,
  quoteIdentifier,
} from "./tableMeta.js";

function maybeSyncCompanyVatFromTaxSchedule(table: string): void {
  if (table === "TaxRateSchedule") {
    syncCompanyVatRateFromSchedule();
  }
}

function maybeAssertBudgetYear(
  table: string,
  values: Record<string, unknown>,
): void {
  if (
    table !== "ProductSalesBudget" &&
    table !== "ProductSalesBudgetMonthPhaseProfile"
  ) {
    return;
  }
  if (!Object.prototype.hasOwnProperty.call(values, "financialYear")) {
    return;
  }
  assertBudgetYear(values.financialYear);
}

function assertBudgetRowAgainstOpenYear(
  table: string,
  primaryKey: Record<string, unknown>,
  updateValues: Record<string, unknown>,
): void {
  if (
    table !== "ProductSalesBudget" &&
    table !== "ProductSalesBudgetMonthPhaseProfile"
  ) {
    return;
  }
  if (Object.prototype.hasOwnProperty.call(updateValues, "financialYear")) {
    assertBudgetYear(updateValues.financialYear);
    return;
  }
  const { clause, params } = buildPrimaryKeyWhere(primaryKey);
  const row = getDatabase()
    .prepare(`SELECT financialYear FROM ${quoteIdentifier(table)} WHERE ${clause}`)
    .get(...params) as { financialYear: number } | undefined;
  if (row) {
    assertBudgetYear(row.financialYear);
  }
}

function getColumnMetaMap(schema: TableSchema): Map<string, TableSchema["columns"][number]> {
  return new Map(schema.columns.map((column) => [column.name, column]));
}

function coerceValue(
  columnName: string,
  rawValue: unknown,
  columnMeta: TableSchema["columns"][number] | undefined,
): unknown {
  if (rawValue === "" || rawValue === undefined || rawValue === null) {
    return null;
  }

  if (columnMeta?.isBoolean) {
    if (rawValue === true || rawValue === 1 || rawValue === "1" || rawValue === "true") {
      return 1;
    }

    if (rawValue === false || rawValue === 0 || rawValue === "0" || rawValue === "false") {
      return 0;
    }
  }

  const type = columnMeta?.type.toUpperCase() ?? "TEXT";

  if (type.includes("INT")) {
    const parsed = Number.parseInt(String(rawValue), 10);
    if (Number.isNaN(parsed)) {
      throw new Error(`"${columnName}" must be an integer`);
    }
    return parsed;
  }

  if (type.includes("REAL") || type.includes("FLOA") || type.includes("DOUB")) {
    const parsed = Number.parseFloat(String(rawValue));
    if (Number.isNaN(parsed)) {
      throw new Error(`"${columnName}" must be a number`);
    }
    return parsed;
  }

  return String(rawValue);
}

function wrapDatabaseError(error: unknown): Error {
  if (error instanceof Error) {
    const code = "code" in error ? String(error.code) : "";

    if (code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return new Error(
        "A linked record was not found. Check category, product, service, or customer type selections.",
      );
    }

    if (code === "SQLITE_CONSTRAINT_UNIQUE") {
      return new Error("A record with these values already exists.");
    }

    return error;
  }

  return new Error("Database operation failed.");
}

function applyUserPassword(values: Record<string, unknown>): Record<string, unknown> {
  const nextValues = { ...values };
  const password = nextValues.password;

  delete nextValues.password;
  delete nextValues.passwordPlain;
  delete nextValues.passwordHash;

  if (typeof password === "string" && password.trim()) {
    nextValues.passwordHash = hashPassword(password.trim());
  }

  return nextValues;
}

function appendUserPasswordHash(
  table: string,
  values: Record<string, unknown>,
  prepared: Record<string, unknown>,
  mode: "create" | "update",
): void {
  if (table !== "User") {
    return;
  }

  if (typeof values.passwordHash === "string" && values.passwordHash.trim()) {
    prepared.passwordHash = values.passwordHash;
    return;
  }

  if (mode === "create") {
    throw new Error("Password is required when creating a user.");
  }
}

function prepareInsertValues(
  table: string,
  schema: TableSchema,
  inputValues: Record<string, unknown>,
): Record<string, unknown> {
  let values =
    table === "User" ? applyUserPassword(inputValues) : { ...inputValues };

  const columnMeta = getColumnMetaMap(schema);
  const prepared: Record<string, unknown> = {};

  for (const column of schema.columns) {
    if (column.isHidden || column.name === "password") {
      continue;
    }

    if (!column.isEditableOnCreate) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(values, column.name)) {
      const coerced = coerceValue(
        column.name,
        values[column.name],
        column,
      );

      if (coerced === null && !column.isRequired) {
        continue;
      }

      prepared[column.name] = coerced;
      continue;
    }

    if (column.isPrimaryKey && column.type.toUpperCase().includes("TEXT")) {
      prepared[column.name] = createTextPrimaryKey();
      continue;
    }

    if (column.isRequired) {
      throw new Error(`"${column.name}" is required`);
    }
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  if (schema.columns.some((column) => column.name === "createdAt")) {
    prepared.createdAt ??= now;
  }
  if (schema.columns.some((column) => column.name === "updatedAt")) {
    prepared.updatedAt ??= now;
  }

  for (const column of schema.columns) {
    if (
      column.isEditableOnCreate &&
      prepared[column.name] === null &&
      column.isRequired
    ) {
      throw new Error(`"${column.name}" is required`);
    }
  }

  appendUserPasswordHash(table, values, prepared, "create");
  maybeAssertBudgetYear(table, prepared);

  return prepared;
}

function prepareUpdateValues(
  table: string,
  schema: TableSchema,
  inputValues: Record<string, unknown>,
): Record<string, unknown> {
  let values =
    table === "User" ? applyUserPassword(inputValues) : { ...inputValues };

  const prepared: Record<string, unknown> = {};

  for (const column of schema.columns) {
    if (column.isHidden || column.name === "password") {
      continue;
    }

    if (!column.isEditableOnUpdate) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(values, column.name)) {
      continue;
    }

    prepared[column.name] = coerceValue(
      column.name,
      values[column.name],
      column,
    );
  }

  if (schema.columns.some((column) => column.name === "updatedAt")) {
    prepared.updatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  if (Object.keys(prepared).length === 0) {
    throw new Error("No editable fields were provided");
  }

  appendUserPasswordHash(table, values, prepared, "update");
  maybeAssertBudgetYear(table, prepared);

  return prepared;
}

function buildPrimaryKeyWhere(primaryKey: Record<string, unknown>): {
  clause: string;
  params: unknown[];
} {
  const parts: string[] = [];
  const params: unknown[] = [];

  for (const [column, value] of Object.entries(primaryKey)) {
    parts.push(`${quoteIdentifier(column)} = ?`);
    params.push(value);
  }

  return {
    clause: parts.join(" AND "),
    params,
  };
}

export function getTableSchema(table: string): TableSchema {
  assertMutableTable(table);
  return buildTableSchema(table);
}

export function insertRow(input: TableInsertInput): Record<string, unknown> {
  try {
    const table = input.table.trim();
    assertMutableTable(table);

    const schema = buildTableSchema(table);
    const values = prepareInsertValues(table, schema, input.values ?? {});
    const columns = Object.keys(values);

    if (columns.length === 0) {
      throw new Error("No values provided for insert");
    }

    const placeholders = columns.map(() => "?").join(", ");
    const quotedTable = quoteIdentifier(table);
    const columnList = columns.map((column) => quoteIdentifier(column)).join(", ");

    getDatabase()
      .prepare(
        `INSERT INTO ${quotedTable} (${columnList})
       VALUES (${placeholders})`,
      )
      .run(...columns.map((column) => values[column]));

    const primaryKeyValues: Record<string, unknown> = {};

    for (const column of schema.primaryKeyColumns) {
      const meta = schema.columns.find((item) => item.name === column);

      if (values[column] !== undefined) {
        primaryKeyValues[column] = values[column];
        continue;
      }

      if (meta?.isAutoIncrement) {
        const lastInsert = getDatabase()
          .prepare("SELECT last_insert_rowid() AS id")
          .get() as { id: number };
        primaryKeyValues[column] = lastInsert.id;
      }
    }

    if (schema.primaryKeyColumns.length === 0) {
      return values;
    }

    if (Object.keys(primaryKeyValues).length !== schema.primaryKeyColumns.length) {
      throw new Error("Could not determine inserted row primary key");
    }

    const { clause, params } = buildPrimaryKeyWhere(primaryKeyValues);
    const row = getDatabase()
      .prepare(`SELECT * FROM ${quotedTable} WHERE ${clause}`)
      .get(...params) as Record<string, unknown>;

    maybeSyncCompanyVatFromTaxSchedule(table);

    return row;
  } catch (error) {
    throw wrapDatabaseError(error);
  }
}

export function updateRow(input: TableUpdateInput): Record<string, unknown> {
  try {
    const table = input.table.trim();
    assertMutableTable(table);

    const schema = buildTableSchema(table);
    const primaryKey = extractPrimaryKey(input.primaryKey, schema.primaryKeyColumns);
    const values = prepareUpdateValues(table, schema, input.values ?? {});
    assertBudgetRowAgainstOpenYear(table, primaryKey, values);
    const columns = Object.keys(values);

    const assignments = columns
      .map((column) => `${quoteIdentifier(column)} = ?`)
      .join(", ");
    const quotedTable = quoteIdentifier(table);
    const { clause, params: keyParams } = buildPrimaryKeyWhere(primaryKey);

    getDatabase()
      .prepare(
        `UPDATE ${quotedTable}
       SET ${assignments}
       WHERE ${clause}`,
      )
      .run(...columns.map((column) => values[column]), ...keyParams);

    const row = getDatabase()
      .prepare(`SELECT * FROM ${quotedTable} WHERE ${clause}`)
      .get(...keyParams) as Record<string, unknown>;

    maybeSyncCompanyVatFromTaxSchedule(table);

    return row;
  } catch (error) {
    throw wrapDatabaseError(error);
  }
}

export function deleteRow(input: TableDeleteInput): void {
  try {
    const table = input.table.trim();
    assertMutableTable(table);

    const schema = buildTableSchema(table);
    const primaryKey = extractPrimaryKey(input.primaryKey, schema.primaryKeyColumns);
    const quotedTable = quoteIdentifier(table);
    const { clause, params } = buildPrimaryKeyWhere(primaryKey);

    const result = getDatabase()
      .prepare(`DELETE FROM ${quotedTable} WHERE ${clause}`)
      .run(...params);

    if (result.changes === 0) {
      throw new Error("Row was not found");
    }

    maybeSyncCompanyVatFromTaxSchedule(table);
  } catch (error) {
    throw wrapDatabaseError(error);
  }
}

export function getFormDefaults(schema: TableSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const column of schema.columns) {
    if (column.isHidden || column.name === "password") {
      continue;
    }

    if (column.isBoolean) {
      defaults[column.name] = 0;
      continue;
    }

    const normalized = normalizeDefaultValue(column.defaultValue);
    if (normalized !== null) {
      defaults[column.name] = normalized;
    } else if (column.allowsNull) {
      defaults[column.name] = "";
    } else {
      defaults[column.name] = "";
    }
  }

  return defaults;
}

export function getEditableColumns(
  schema: TableSchema,
  mode: "create" | "edit",
): TableSchema["columns"] {
  return schema.columns.filter((column) =>
    mode === "create" ? column.isEditableOnCreate : column.isEditableOnUpdate,
  );
}
