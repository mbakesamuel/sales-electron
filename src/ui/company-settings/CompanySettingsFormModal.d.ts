import "./CompanySettingsScreen.css";
export declare const MONTHS: readonly ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export { UI_THEME_PRESETS as THEME_PRESETS } from "../theme/applyUiTheme.ts";
export { UI_THEME_LABELS as THEME_LABELS } from "../theme/applyUiTheme.ts";
export { UI_THEME_COLORS as THEME_COLORS } from "../theme/applyUiTheme.ts";
interface CompanySettingsFormModalProps {
    mode: "create" | "edit";
    row?: Record<string, unknown>;
    onClose: () => void;
    onSaved: () => void;
}
export declare function CompanySettingsFormModal({ mode, row, onClose, onSaved, }: CompanySettingsFormModalProps): import("preact").JSX.Element;
