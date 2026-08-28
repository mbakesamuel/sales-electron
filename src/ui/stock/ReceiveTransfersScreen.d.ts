import type { AuthUser } from "../auth/session.ts";
import "./StockScreen.css";
interface ReceiveTransfersScreenProps {
    user: AuthUser;
}
export declare function ReceiveTransfersScreen({ user }: ReceiveTransfersScreenProps): import("preact").JSX.Element;
export {};
