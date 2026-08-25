import type { AuthUser } from "../auth/session.ts";
import "./StockScreen.css";
interface StockValidationScreenProps {
    user: AuthUser;
}
export declare function StockValidationScreen({ user }: StockValidationScreenProps): import("preact").JSX.Element;
export {};
