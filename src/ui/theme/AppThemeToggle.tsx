import { useEffect, useState } from "preact/hooks";
import { getAuthenticatedDb } from "../auth/db.ts";
import {
  applyUiTheme,
  loadAndApplyCompanyTheme,
  UI_THEME_COLORS,
  UI_THEME_LABELS,
  UI_THEME_PRESETS,
  type UiThemePreset,
} from "./applyUiTheme.ts";
import "./AppThemeToggle.css";

export function AppThemeToggle() {
  const [active, setActive] = useState<UiThemePreset>(() =>
    applyUiTheme(document.documentElement.dataset.theme),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadAndApplyCompanyTheme().then((preset) => {
      if (!cancelled) {
        setActive(preset);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function selectTheme(preset: UiThemePreset) {
    if (busy || preset === active) {
      return;
    }
    setBusy(true);
    setActive(preset);
    applyUiTheme(preset);
    try {
      const result = await getAuthenticatedDb().queryTable({
        table: "CompanySettings",
        limit: 50,
      });
      const row =
        result.rows.find((item) => String(item.id) === "default") ?? result.rows[0];
      if (row?.id != null) {
        await getAuthenticatedDb().updateRow({
          table: "CompanySettings",
          primaryKey: { id: row.id },
          values: { uiThemePreset: preset },
        });
      }
    } catch {
      // Theme still applied locally for this session.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="app-theme-toggle" role="group" aria-label="App theme">
      {UI_THEME_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          class={`app-theme-toggle-option${
            active === preset ? " is-active" : ""
          }`}
          disabled={busy}
          aria-pressed={active === preset}
          onClick={() => void selectTheme(preset)}
        >
          <span
            class="app-theme-toggle-dot"
            style={{ background: UI_THEME_COLORS[preset] }}
            aria-hidden="true"
          />
          {UI_THEME_LABELS[preset]}
        </button>
      ))}
    </div>
  );
}
