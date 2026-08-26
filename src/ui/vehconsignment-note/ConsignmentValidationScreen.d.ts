import type { AuthUser } from "../auth/session.ts";
import "./VcnPrintView.css";
import "../sales/sales.css";
interface ConsignmentValidationScreenProps {
    user: AuthUser;
}
export declare function ConsignmentValidationScreen({ user, }: ConsignmentValidationScreenProps): import("preact").JSX.Element;
export {};
