export type UiThemePreset = "agro" | "dark";
export declare const UI_THEME_PRESETS: UiThemePreset[];
export declare function normalizeUiThemePreset(value: unknown): UiThemePreset;
export declare function applyUiTheme(preset: unknown): UiThemePreset;
export declare function loadAndApplyCompanyTheme(): Promise<UiThemePreset>;
