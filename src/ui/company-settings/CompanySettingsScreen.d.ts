import type { AuthUser } from "../auth/session.ts";
import "./CompanySettingsScreen.css";
export type ThemePreset = "agro" | "dark";
interface CompanySettingsScreenProps {
    readOnly?: boolean;
    user?: AuthUser | null;
}
export declare function CompanySettingsScreen({ readOnly, user, }?: CompanySettingsScreenProps): import("preact").JSX.Element;
export {};
