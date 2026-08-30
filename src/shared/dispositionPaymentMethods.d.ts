import type { SaleDisposition } from "./sales.types.js";
/** System payment method for Ration (deferred) sales. */
export declare const SYS_PM_RATION = "sys-pm-ration";
/** System payment method for Public relation (complimentary) sales. */
export declare const SYS_PM_PUBLIC_RELATION = "sys-pm-public-relation";
export declare const DISPOSITION_PAYMENT_METHOD_IDS: readonly ["sys-pm-ration", "sys-pm-public-relation"];
export declare function paymentMethodIdForDisposition(disposition: SaleDisposition): string | null;
export declare function isDispositionPaymentMethodId(paymentMethodId: string): boolean;
