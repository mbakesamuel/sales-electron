import type { AuthUser } from "../../auth/session.ts";
import "../../sales/sales.css";
interface ValidationQueueClientProps {
    user: AuthUser;
    onOpenOrder: (deliveryOrderNo: string) => void;
}
export declare function ValidationQueueClient({ user, onOpenOrder }: ValidationQueueClientProps): import("preact").JSX.Element;
export {};
