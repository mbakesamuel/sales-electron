import type { TableQueryInput, TableQueryResult } from "../../shared/database.types.js";
import { getDatabase } from "./index.js";
import {
  assertMutableTable,
  getVisibleColumnNames,
  quoteIdentifier,
} from "./tableMeta.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function getSearchableColumns(table: string, columns: string[]): string[] {
  const quotedTable = quoteIdentifier(table);
  const columnTypes = getDatabase()
    .prepare(`PRAGMA table_info(${quotedTable})`)
    .all() as { name: string; type: string }[];

  const textColumns = new Set(
    columnTypes
      .filter((column) => {
        const type = column.type.toUpperCase();
        return type.includes("CHAR") || type.includes("TEXT") || type.includes("CLOB");
      })
      .map((column) => column.name),
  );

  return columns.filter((column) => textColumns.has(column));
}

function resolveOrderColumn(table: string, columns: string[]): string {
  const preferred = ["createdAt", "updatedAt", "occurredAt", "openedAt", "name", "id"];
  for (const column of preferred) {
    if (columns.includes(column)) {
      return quoteIdentifier(column);
    }
  }

  return quoteIdentifier(columns[0] ?? "rowid");
}

export function queryTable(input: TableQueryInput): TableQueryResult {
  const table = input.table.trim();
  assertMutableTable(table);

  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const offset = Math.max(input.offset ?? 0, 0);
  const search = input.search?.trim() ?? "";

  const columns = getVisibleColumnNames(table);
  if (columns.length === 0) {
    return { table, columns, rows: [], total: 0, limit, offset };
  }

  const quotedTable = quoteIdentifier(table);
  const selectList = columns.map((column) => quoteIdentifier(column)).join(", ");
  const orderColumn = resolveOrderColumn(table, columns);

  let whereClause = "";
  const params: unknown[] = [];

  if (search) {
    const searchableColumns = getSearchableColumns(table, columns);
    if (searchableColumns.length > 0) {
      const likeValue = `%${search}%`;
      whereClause = `WHERE ${searchableColumns
        .map((column) => `${quoteIdentifier(column)} LIKE ?`)
        .join(" OR ")}`;
      params.push(...searchableColumns.map(() => likeValue));
    }
  }

  const totalRow = getDatabase()
    .prepare(`SELECT COUNT(*) AS total FROM ${quotedTable} ${whereClause}`)
    .get(...params) as { total: number };

  const rows = getDatabase()
    .prepare(
      `SELECT ${selectList}
       FROM ${quotedTable}
       ${whereClause}
       ORDER BY ${orderColumn} DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return {
    table,
    columns,
    rows,
    total: totalRow.total,
    limit,
    offset,
  };
}
