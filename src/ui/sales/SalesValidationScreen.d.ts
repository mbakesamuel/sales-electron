import type { AuthUser } from "../auth/session.ts";
import "./sales.css";
interface SalesValidationScreenProps {
    user: AuthUser;
}
export declare function SalesValidationScreen({ user }: SalesValidationScreenProps): import("preact").JSX.Element;
export {};
