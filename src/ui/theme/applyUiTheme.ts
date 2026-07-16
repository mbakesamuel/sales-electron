import { getElectronApi } from "../auth/client.ts";

export type UiThemePreset = "agro" | "dark";

export const UI_THEME_PRESETS: UiThemePreset[] = ["agro", "dark"];

export function normalizeUiThemePreset(value: unknown): UiThemePreset {
  return value === "dark" ? "dark" : "agro";
}

export function applyUiTheme(preset: unknown): UiThemePreset {
  const resolved = normalizeUiThemePreset(preset);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved === "dark" ? "dark" : "light";
  return resolved;
}

export async function loadAndApplyCompanyTheme(): Promise<UiThemePreset> {
  try {
    const result = await getElectronApi().db.queryTable({
      table: "CompanySettings",
      limit: 50,
    });
    const row =
      result.rows.find((item) => String(item.id) === "default") ?? result.rows[0];
    return applyUiTheme(row?.uiThemePreset);
  } catch {
    return applyUiTheme("agro");
  }
}
