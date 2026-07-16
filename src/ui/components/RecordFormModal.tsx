import { useEffect, useMemo, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";

import { formatRoleLabel, USER_ROLES } from "../../shared/roles.ts";
import {
  normalizeTaxRateDecimal,
  TAX_RATE_KIND_LABELS,
  TAX_RATE_KINDS,
  TAX_REGIME_KIND_LABELS,
  type TaxRegimeKind,
} from "../../shared/taxRules.ts";
import type { ColumnMeta, TableSchema } from "../types/electron.d.ts";
import { FormDialog } from "./FormDialog.tsx";

type FormMode = "create" | "edit";

const TAX_REGIME_KINDS = Object.keys(TAX_REGIME_KIND_LABELS) as TaxRegimeKind[];
const TAX_REGIME_HIDDEN_COLUMNS = new Set(["commercialServiceId"]);

function taxRateDecimalToPercentInput(stored: string | number | null | undefined): string {
  const decimal = normalizeTaxRateDecimal(stored);
  const percent = decimal * 100;
  return Number.isFinite(percent) ? String(Number(percent.toFixed(4))) : "0";
}

function taxRatePercentInputToDecimal(percentText: string): string {
  const percent = Number.parseFloat(percentText);
  if (!Number.isFinite(percent)) {
    return "0";
  }
  return String(percent / 100);
}

interface RecordFormModalProps {
  table: string;
  mode: FormMode;
  schema: TableSchema;
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

function formatColumnLabel(column: string): string {
  return column
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ");
}

function normalizeDefaultValue(defaultValue: string | null): string {
  if (defaultValue === null) {
    return "";
  }

  const trimmed = defaultValue.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function buildInitialValues(
  schema: TableSchema,
  mode: FormMode,
  table: string,
  row?: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};

  for (const column of schema.columns) {
    if (column.isHidden) {
      continue;
    }

    const isEditable =
      mode === "create" ? column.isEditableOnCreate : column.isEditableOnUpdate;

    if (!isEditable && !(mode === "edit" && column.isPrimaryKey)) {
      continue;
    }

    if (row && column.name in row && row[column.name] != null) {
      if (column.isBoolean) {
        values[column.name] = row[column.name] === 1 || row[column.name] === true;
      } else if (table === "TaxRateSchedule" && column.name === "rate") {
        values[column.name] = taxRateDecimalToPercentInput(
          row[column.name] as string | number,
        );
      } else {
        values[column.name] = String(row[column.name]);
      }
      continue;
    }

    if (column.isBoolean) {
      values[column.name] = false;
      continue;
    }

    if (table === "TaxRateSchedule" && column.name === "rateKind") {
      values[column.name] = "VAT";
      continue;
    }

    if (table === "TaxRateSchedule" && column.name === "rate") {
      values[column.name] = "19.25";
      continue;
    }

    if (table === "TaxRateSchedule" && column.name === "effectiveFrom") {
      values[column.name] = new Date().toISOString().slice(0, 10);
      continue;
    }

    values[column.name] = normalizeDefaultValue(column.defaultValue);
  }

  return values;
}

function getEditableColumns(
  schema: TableSchema,
  mode: FormMode,
  table: string,
): ColumnMeta[] {
  return schema.columns.filter((column) => {
    if (column.isHidden) {
      return false;
    }

    if (table === "TaxRegime" && TAX_REGIME_HIDDEN_COLUMNS.has(column.name)) {
      return false;
    }

    if (mode === "create") {
      return column.isEditableOnCreate;
    }

    return column.isEditableOnUpdate || column.isPrimaryKey;
  });
}

function isPasswordField(column: ColumnMeta): boolean {
  return column.type === "PASSWORD" || column.name === "password";
}

interface LookupConfig {
  table: string;
  labelColumns: string[];
}

// Foreign-key columns rendered as selects: the ID is stored, the name is shown.
const LOOKUP_COLUMNS: Record<string, LookupConfig> = {
  taxRegimeId: { table: "TaxRegime", labelColumns: ["name"] },
  commercialServiceId: { table: "CommercialService", labelColumns: ["name", "code"] },
  customerTypeId: { table: "CustomerTypeDefinition", labelColumns: ["name", "code"] },
};

interface LookupOption {
  id: string;
  label: string;
}

function buildLookupLabel(
  row: Record<string, unknown>,
  labelColumns: string[],
): string {
  for (const column of labelColumns) {
    const value = row[column];
    if (value != null && String(value).trim()) {
      return String(value);
    }
  }

  return String(row.id ?? "");
}

function isMultilineField(column: ColumnMeta): boolean {
  return /address|notes|description|modules/i.test(column.name);
}

function buildRowKey(
  schema: TableSchema,
  row?: Record<string, unknown>,
): string {
  if (!row) {
    return "";
  }

  const key: Record<string, unknown> = {};
  for (const column of schema.primaryKeyColumns) {
    key[column] = row[column];
  }

  return JSON.stringify(key);
}

export function RecordFormModal({
  table,
  mode,
  schema,
  row,
  onClose,
  onSaved,
}: RecordFormModalProps) {
  const [values, setValues] = useState<Record<string, string | number | boolean>>(
    () => buildInitialValues(schema, mode, table, row),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupOptions, setLookupOptions] = useState<Record<string, LookupOption[]>>({});

  const title = `${mode === "create" ? "Add" : "Edit"} ${table}`;
  const rowKey = useMemo(() => buildRowKey(schema, row), [schema, row]);

  useEffect(() => {
    setValues(buildInitialValues(schema, mode, table, row));
    setError(null);
  }, [schema, mode, rowKey, table]);

  const editableColumns = getEditableColumns(schema, mode, table);

  const lookupColumnNames = useMemo(
    () =>
      editableColumns
        .map((column) => column.name)
        .filter((name) => name in LOOKUP_COLUMNS),
    [editableColumns],
  );

  useEffect(() => {
    if (lookupColumnNames.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadLookups() {
      const loaded: Record<string, LookupOption[]> = {};

      await Promise.all(
        lookupColumnNames.map(async (columnName) => {
          const config = LOOKUP_COLUMNS[columnName];
          try {
            const result = await getAuthenticatedDb().queryTable({
              table: config.table,
              limit: 200,
            });
            loaded[columnName] = result.rows
              .map((optionRow) => ({
                id: String(optionRow.id ?? ""),
                label: buildLookupLabel(optionRow, config.labelColumns),
              }))
              .sort((left, right) => left.label.localeCompare(right.label));
          } catch {
            loaded[columnName] = [];
          }
        }),
      );

      if (!cancelled) {
        setLookupOptions(loaded);
      }
    }

    void loadLookups();

    return () => {
      cancelled = true;
    };
  }, [lookupColumnNames.join(",")]);

  function updateValue(name: string, value: string | number | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = { ...values };

      if (table === "TaxRateSchedule" && "rate" in payload) {
        const percent = Number.parseFloat(String(payload.rate ?? ""));
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
          throw new Error("Rate must be a percent from 0 to 100.");
        }
        payload.rate = taxRatePercentInputToDecimal(String(payload.rate));
      }

      if (table === "User" && mode === "create" && !String(payload.password ?? "").trim()) {
        throw new Error("Password is required when creating a user.");
      }

      if (mode === "create") {
        await getAuthenticatedDb().insertRow({ table, values: payload });
      } else {
        if (!row) {
          throw new Error("Row data is missing.");
        }

        const primaryKey: Record<string, unknown> = {};
        for (const column of schema.primaryKeyColumns) {
          primaryKey[column] = row[column];
        }

        await getAuthenticatedDb().updateRow({
          table,
          primaryKey,
          values: payload,
        });
      }

      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save record.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormDialog ariaLabel={title} title={title} wide onClose={onClose}>
      <form class="form-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
        {editableColumns.map((column) => {
          const label = formatColumnLabel(column.name);
          const readOnly = mode === "edit" && column.isPrimaryKey;
          const required =
            column.isRequired ||
            (table === "User" && column.name === "password" && mode === "create");
          const labelText = `${label}${required ? " *" : ""}`;

          if (column.isBoolean && !isPasswordField(column)) {
            return (
              <div key={column.name} class="form-dialog-row form-dialog-row-center">
                <span class="form-dialog-label">{labelText}</span>
                <label class="form-dialog-checkbox-label">
                  <input
                    type="checkbox"
                    checked={Boolean(values[column.name])}
                    disabled={readOnly || isSubmitting}
                    onChange={(event) =>
                      updateValue(
                        column.name,
                        (event.currentTarget as HTMLInputElement).checked,
                      )
                    }
                  />
                  Enabled
                </label>
              </div>
            );
          }

          if (isPasswordField(column)) {
            return (
              <div key={column.name} class="form-dialog-row">
                <label class="form-dialog-label" for={`record-${column.name}`}>
                  {labelText}
                </label>
                <input
                  id={`record-${column.name}`}
                  class="form-dialog-input"
                  type="password"
                  value={String(values[column.name] ?? "")}
                  disabled={isSubmitting}
                  autocomplete="new-password"
                  onInput={(event) =>
                    updateValue(
                      column.name,
                      (event.currentTarget as HTMLInputElement).value,
                    )
                  }
                />
              </div>
            );
          }

          if (table === "User" && column.name === "role" && !readOnly) {
            const currentValue = String(values[column.name] ?? USER_ROLES[0]);

            return (
              <div key={column.name} class="form-dialog-row">
                <label class="form-dialog-label" for={`record-${column.name}`}>
                  {labelText}
                </label>
                <div class="form-dialog-control">
                  <select
                    id={`record-${column.name}`}
                    class="form-dialog-input"
                    value={currentValue}
                    disabled={isSubmitting}
                    required={required}
                    onChange={(event) =>
                      updateValue(
                        column.name,
                        (event.currentTarget as HTMLSelectElement).value,
                      )
                    }
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {formatRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          }

          if (table === "TaxRegime" && column.name === "kind" && !readOnly) {
            const currentValue = String(values[column.name] ?? "SIMPLIFIED");

            return (
              <div key={column.name} class="form-dialog-row">
                <label class="form-dialog-label" for={`record-${column.name}`}>
                  {labelText}
                </label>
                <div class="form-dialog-control">
                  <select
                    id={`record-${column.name}`}
                    class="form-dialog-input"
                    value={currentValue}
                    disabled={isSubmitting}
                    required={required}
                    onChange={(event) =>
                      updateValue(
                        column.name,
                        (event.currentTarget as HTMLSelectElement).value,
                      )
                    }
                  >
                    {TAX_REGIME_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {TAX_REGIME_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          }

          if (table === "TaxRateSchedule" && column.name === "rateKind" && !readOnly) {
            const currentValue = String(values[column.name] ?? "VAT");

            return (
              <div key={column.name} class="form-dialog-row">
                <label class="form-dialog-label" for={`record-${column.name}`}>
                  Rate kind
                </label>
                <div class="form-dialog-control">
                  <select
                    id={`record-${column.name}`}
                    class="form-dialog-input"
                    value={currentValue}
                    disabled={isSubmitting}
                    required={required}
                    onChange={(event) =>
                      updateValue(
                        column.name,
                        (event.currentTarget as HTMLSelectElement).value,
                      )
                    }
                  >
                    {TAX_RATE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {TAX_RATE_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          }

          if (table === "TaxRateSchedule" && column.name === "rate" && !readOnly) {
            return (
              <div key={column.name} class="form-dialog-row">
                <label class="form-dialog-label" for={`record-${column.name}`}>
                  Rate (%)
                </label>
                <input
                  id={`record-${column.name}`}
                  class="form-dialog-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={String(values[column.name] ?? "")}
                  disabled={isSubmitting}
                  required={required}
                  onInput={(event) =>
                    updateValue(
                      column.name,
                      (event.currentTarget as HTMLInputElement).value,
                    )
                  }
                />
              </div>
            );
          }

          if (column.name in LOOKUP_COLUMNS && !readOnly) {
            const options = lookupOptions[column.name] ?? [];
            const currentValue = String(values[column.name] ?? "");
            const hasCurrent =
              !currentValue || options.some((option) => option.id === currentValue);

            return (
              <div key={column.name} class="form-dialog-row">
                <label class="form-dialog-label" for={`record-${column.name}`}>
                  {labelText}
                </label>
                <div class="form-dialog-control">
                  <select
                    id={`record-${column.name}`}
                    class="form-dialog-input"
                    value={currentValue}
                    disabled={isSubmitting}
                    required={required}
                    onChange={(event) =>
                      updateValue(
                        column.name,
                        (event.currentTarget as HTMLSelectElement).value,
                      )
                    }
                  >
                    <option value="">
                      {required ? "Select…" : "— None —"}
                    </option>
                    {!hasCurrent ? (
                      <option value={currentValue}>{currentValue}</option>
                    ) : null}
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          }

          if (isMultilineField(column)) {
            return (
              <div key={column.name} class="form-dialog-row-stretch">
                <label class="form-dialog-label" for={`record-${column.name}`}>
                  {labelText}
                </label>
                <textarea
                  id={`record-${column.name}`}
                  class="form-dialog-input"
                  value={String(values[column.name] ?? "")}
                  disabled={readOnly || isSubmitting}
                  rows={2}
                  onInput={(event) =>
                    updateValue(
                      column.name,
                      (event.currentTarget as HTMLTextAreaElement).value,
                    )
                  }
                />
              </div>
            );
          }

          return (
            <div key={column.name} class="form-dialog-row">
              <label class="form-dialog-label" for={`record-${column.name}`}>
                {labelText}
              </label>
              <input
                id={`record-${column.name}`}
                class="form-dialog-input"
                type={column.type.toUpperCase().includes("INT") ? "number" : "text"}
                value={String(values[column.name] ?? "")}
                disabled={readOnly || isSubmitting}
                onInput={(event) =>
                  updateValue(
                    column.name,
                    (event.currentTarget as HTMLInputElement).value,
                  )
                }
              />
            </div>
          );
        })}

        {error ? <p class="form-dialog-error">{error}</p> : null}

        <div class="form-dialog-actions">
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving…"
              : mode === "create"
                ? "Create"
                : "Save changes"}
          </button>
          <button
            type="button"
            class="form-dialog-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </FormDialog>
  );
}
