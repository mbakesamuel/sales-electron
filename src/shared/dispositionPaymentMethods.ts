import type { SaleDisposition } from "./sales.types.js";

/** System payment method for Ration (deferred) sales. */
export const SYS_PM_RATION = "sys-pm-ration";

/** System payment method for Public relation (complimentary) sales. */
export const SYS_PM_PUBLIC_RELATION = "sys-pm-public-relation";

export const DISPOSITION_PAYMENT_METHOD_IDS = [
  SYS_PM_RATION,
  SYS_PM_PUBLIC_RELATION,
] as const;

export function paymentMethodIdForDisposition(
  disposition: SaleDisposition,
): string | null {
  if (disposition === "RATION") {
    return SYS_PM_RATION;
  }
  if (disposition === "PUBLIC_RELATION") {
    return SYS_PM_PUBLIC_RELATION;
  }
  return null;
}

export function isDispositionPaymentMethodId(paymentMethodId: string): boolean {
  return DISPOSITION_PAYMENT_METHOD_IDS.includes(
    paymentMethodId as (typeof DISPOSITION_PAYMENT_METHOD_IDS)[number],
  );
}
