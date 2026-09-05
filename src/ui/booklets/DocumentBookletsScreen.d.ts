import { type AuthUser } from "../auth/session.ts";
import "../components/FormDialog.css";
import "../customers/CustomersScreen.css";
import "./DocumentBookletsScreen.css";
interface DocumentBookletsScreenProps {
    user: AuthUser;
    canWrite: boolean;
    canValidate?: boolean;
}
export declare function DocumentBookletsScreen({ user: _user, canWrite, canValidate, }: DocumentBookletsScreenProps): import("preact").JSX.Element;
export {};
