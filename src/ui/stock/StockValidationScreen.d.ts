import type { AuthUser } from "../auth/session.ts";
import "./StockScreen.css";
interface StockValidationScreenProps {
    user: AuthUser;
    canValidate: boolean;
}
export declare function StockValidationScreen({ user, canValidate }: StockValidationScreenProps): import("preact").JSX.Element;
export {};
