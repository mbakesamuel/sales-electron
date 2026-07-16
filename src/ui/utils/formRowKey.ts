export function buildRowKey(
  row: Record<string, unknown> | undefined,
  primaryKeyColumns: string[],
): string {
  if (!row) {
    return "";
  }

  const identity: Record<string, unknown> = {};
  for (const column of primaryKeyColumns) {
    identity[column] = row[column];
  }

  return JSON.stringify(identity);
}
