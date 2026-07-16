import { useState } from "preact/hooks";
import { normalizeVatRateDecimal } from "../../shared/taxRules.ts";
import { getAuthenticatedDb } from "../auth/db.ts";
import { FormDialog } from "../components/FormDialog.tsx";
import { applyUiTheme, loadAndApplyCompanyTheme } from "../theme/applyUiTheme.ts";
import type { ThemePreset } from "./CompanySettingsScreen.tsx";
import "./CompanySettingsScreen.css";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const THEME_PRESETS: ThemePreset[] = ["agro", "dark"];

export const THEME_LABELS: Record<ThemePreset, string> = {
  agro: "Agro",
  dark: "Dark",
};

export const THEME_COLORS: Record<ThemePreset, string> = {
  agro: "#c5a017",
  dark: "#1a2418",
};

interface CompanySettingsFormModalProps {
  mode: "create" | "edit";
  row?: Record<string, unknown>;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  companyName: string;
  department: string;
  vatRate: string;
  fiscalYearStartMonth: number;
  logoUrl: string;
  uiThemePreset: ThemePreset;
}

/** Store as decimal (0.1925); show as percent (19.25) in the form. */
function vatDecimalToPercentInput(stored: string | number | null | undefined): string {
  const decimal = normalizeVatRateDecimal(stored);
  const percent = decimal * 100;
  return Number.isFinite(percent) ? String(Number(percent.toFixed(4))) : "0";
}

function vatPercentInputToDecimal(percentText: string): string {
  const percent = Number.parseFloat(percentText);
  if (!Number.isFinite(percent)) {
    return "0";
  }
  return String(percent / 100);
}

function initialForm(
  mode: "create" | "edit",
  row?: Record<string, unknown>,
): FormState {
  if (mode !== "edit" || !row) {
    return {
      companyName: "",
      department: "",
      vatRate: "19.25",
      fiscalYearStartMonth: 1,
      logoUrl: "",
      uiThemePreset: "agro",
    };
  }

  return {
    companyName: String(row.companyName ?? ""),
    department: String(row.department ?? ""),
    vatRate: vatDecimalToPercentInput(row.vatRate as string | number | null),
    fiscalYearStartMonth: Number(row.fiscalYearStartMonth ?? 1),
    logoUrl: String(row.logoUrl ?? ""),
    uiThemePreset: THEME_PRESETS.includes(row.uiThemePreset as ThemePreset)
      ? (row.uiThemePreset as ThemePreset)
      : "agro",
  };
}

export function CompanySettingsFormModal({
  mode,
  row,
  onClose,
  onSaved,
}: CompanySettingsFormModalProps) {
  const [form, setForm] = useState<FormState>(() => initialForm(mode, row));
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.companyName.trim()) {
      nextErrors.companyName = "Required";
    }
    if (!form.department.trim()) {
      nextErrors.department = "Required";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const values: Record<string, unknown> = {
      companyName: form.companyName.trim(),
      department: form.department.trim(),
      fiscalYearStartMonth: form.fiscalYearStartMonth,
      logoUrl: form.logoUrl.trim() || null,
      uiThemePreset: form.uiThemePreset,
    };

    if (mode === "create") {
      values.vatRate = vatPercentInputToDecimal(form.vatRate);
    }

    try {
      if (mode === "create") {
        await getAuthenticatedDb().insertRow({
          table: "CompanySettings",
          values,
        });
      } else {
        if (!row?.id) {
          throw new Error("Company settings id is missing.");
        }
        await getAuthenticatedDb().updateRow({
          table: "CompanySettings",
          primaryKey: { id: row.id },
          values,
        });
      }

      onSaved();
      if (mode === "create" || String(row?.id) === "default") {
        applyUiTheme(form.uiThemePreset);
      }
      onClose();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save company settings.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    void loadAndApplyCompanyTheme().finally(() => onClose());
  }

  const inputClass = "company-settings-input";

  return (
    <FormDialog
      ariaLabel={mode === "create" ? "New company settings" : "Edit company settings"}
      title={mode === "create" ? "New record" : "Edit record"}
      subtitle="Company identity, tax year, and interface preferences"
      wide
      onClose={handleClose}
    >
      <form
        class="company-settings-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div class="company-settings-form-grid">
          <label class="company-settings-field">
            <span>Company name</span>
            <input
              class={inputClass}
              value={form.companyName}
              disabled={isSubmitting}
              placeholder="Meridian Logistics GmbH"
              onInput={(event) =>
                update(
                  "companyName",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
            {errors.companyName ? (
              <small class="company-settings-field-error">{errors.companyName}</small>
            ) : null}
          </label>

          <label class="company-settings-field">
            <span>Department</span>
            <input
              class={inputClass}
              value={form.department}
              disabled={isSubmitting}
              placeholder="Finance"
              onInput={(event) =>
                update(
                  "department",
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
            />
            {errors.department ? (
              <small class="company-settings-field-error">{errors.department}</small>
            ) : null}
          </label>

          <label class="company-settings-field">
            <span>VAT rate (%)</span>
            <input
              class={inputClass}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.vatRate}
              disabled
              readOnly
            />
            <small class="company-settings-field-hint">
              Managed under Tax → Tax rates (date-effective schedules).
            </small>
          </label>

          <label class="company-settings-field">
            <span>Fiscal year start</span>
            <select
              class={inputClass}
              value={form.fiscalYearStartMonth}
              disabled={isSubmitting}
              onChange={(event) =>
                update(
                  "fiscalYearStartMonth",
                  Number((event.currentTarget as HTMLSelectElement).value),
                )
              }
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label class="company-settings-field">
          <span>Logo URL</span>
          <input
            class={inputClass}
            type="url"
            value={form.logoUrl}
            disabled={isSubmitting}
            placeholder="https://example.com/logo.png"
            onInput={(event) =>
              update("logoUrl", (event.currentTarget as HTMLInputElement).value)
            }
          />
        </label>

        <fieldset class="company-settings-theme-fieldset">
          <legend>App theme</legend>
          <p class="company-settings-theme-hint">
            Applies across the whole app (login and home).
          </p>
          <div class="company-settings-theme-grid">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                class={`company-settings-theme-option${
                  form.uiThemePreset === preset ? " is-selected" : ""
                }`}
                disabled={isSubmitting}
                onClick={() => {
                  update("uiThemePreset", preset);
                  applyUiTheme(preset);
                }}
              >
                <span
                  class="company-settings-theme-dot"
                  style={{ background: THEME_COLORS[preset] }}
                />
                {THEME_LABELS[preset]}
              </button>
            ))}
          </div>
        </fieldset>

        {submitError ? (
          <p class="form-dialog-error">{submitError}</p>
        ) : null}

        <div class="form-dialog-actions">
          <button
            type="button"
            class="form-dialog-btn-secondary"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="form-dialog-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save record"}
          </button>
        </div>
      </form>
    </FormDialog>
  );
}
