import { type AuthUser } from "../auth/session.ts";
import "../components/FormDialog.css";
import "../customers/CustomersScreen.css";
import "./DocumentBookletsScreen.css";
interface BookletValidationScreenProps {
    user: AuthUser;
}
export declare function BookletValidationScreen({ user: _user }: BookletValidationScreenProps): import("preact").JSX.Element;
export {};
