import { useEffect, useState } from "preact/hooks";
import { SlidersHorizontal } from "lucide-react";
import { getAuthenticatedDb } from "../auth/db.ts";
import "../company-settings/CompanySettingsScreen.css";

interface ReportSettingsScreenProps {
  readOnly?: boolean;
}

export function ReportSettingsScreen({ readOnly = false }: ReportSettingsScreenProps) {
  const [hideZeroReportRows, setHideZeroReportRows] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const result = await getAuthenticatedDb().queryTable({ table: "CompanySettings" });
      const row = (result.rows as Array<Record<string, unknown>>).find(
        (r) => String(r.id) === "default",
      );
      if (!row) {
        setError("Company settings row not found. Configure App settings first.");
        setHideZeroReportRows(true);
        return;
      }
      const raw = row.hideZeroReportRows;
      setHideZeroReportRows(raw == null ? true : Number(raw) !== 0);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load report settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onSave() {
    if (readOnly || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    setSavedHint(null);
    try {
      await getAuthenticatedDb().updateRow({
        table: "CompanySettings",
        primaryKey: { id: "default" },
        values: {
          hideZeroReportRows: hideZeroReportRows ? 1 : 0,
        },
      });
      setSavedHint("Report settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save report settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="company-settings-screen">
      <header class="company-settings-header">
        <div class="company-settings-heading">
          <SlidersHorizontal size={22} aria-hidden="true" />
          <div>
            <h2>Report settings</h2>
            <p>Display options for stock and delivery reports</p>
          </div>
        </div>
        {!readOnly ? (
          <button
            type="button"
            class="company-settings-primary-btn"
            disabled={loading || saving}
            onClick={() => void onSave()}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
      </header>

      <div class="company-settings-toolbar">
        {loading ? <span>Loading…</span> : null}
        {savedHint && !error ? <span>{savedHint}</span> : null}
      </div>

      {error ? (
        <p class="company-settings-error" style="padding: 0 24px; color: #b91c1c;">
          {error}
        </p>
      ) : null}

      <section style="padding: 8px 24px 32px; max-width: 40rem;">
        <label
          style="display: flex; gap: 12px; align-items: flex-start; cursor: pointer; font-size: 14px;"
        >
          <input
            type="checkbox"
            checked={hideZeroReportRows}
            disabled={loading || readOnly || saving}
            onChange={(event) => {
              setHideZeroReportRows((event.currentTarget as HTMLInputElement).checked);
              setSavedHint(null);
            }}
            style="margin-top: 3px;"
          />
          <span>
            <strong style="display: block; font-weight: 700; color: var(--text-h);">
              Hide rows with zero or empty quantities
            </strong>
            <span style="display: block; margin-top: 6px; color: #64748b; font-size: 13px; line-height: 1.45;">
              When enabled, reports omit rows (and empty sales-point blocks) whose
              quantities are zero or blank. Applies to Stock, Stock &amp; commitment,
              Commitment, Weekly deliveries, and Bottle oil stock &amp; sales.
              Turn off to show those rows for reconciliation.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}
