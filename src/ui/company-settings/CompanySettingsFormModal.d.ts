import type { ThemePreset } from "./CompanySettingsScreen.tsx";
import "./CompanySettingsScreen.css";
export declare const MONTHS: readonly ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export declare const THEME_PRESETS: ThemePreset[];
export declare const THEME_LABELS: Record<ThemePreset, string>;
export declare const THEME_COLORS: Record<ThemePreset, string>;
interface CompanySettingsFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function CompanySettingsFormModal({ mode, row, onClose, onSaved, }: CompanySettingsFormModalProps): import("preact").JSX.Element;
export {};
