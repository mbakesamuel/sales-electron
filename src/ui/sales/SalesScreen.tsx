import { useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import {
  canAccessSalesModuleForVariant,
  isSalesModuleReadOnlyForVariant,
  saleProductModeForVariant,
  type SalesModuleVariant,
} from "../../shared/salesModule.ts";
import type { AuthUser } from "../auth/session.ts";
import { SalesClient } from "./SalesClient.tsx";
import { SalesList } from "./SalesList.tsx";

interface SalesScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  readOnly?: boolean;
  variant?: SalesModuleVariant;
}

type SalesView = "pos" | "list";

export function SalesScreen({
  user,
  permissions,
  readOnly = false,
  variant = "loose",
}: SalesScreenProps) {
  const canAccess = canAccessSalesModuleForVariant(permissions, variant);
  const canUsePos =
    canAccess &&
    !isSalesModuleReadOnlyForVariant(permissions, variant) &&
    !readOnly;
  const [view, setView] = useState<SalesView>(canUsePos ? "pos" : "list");
  const [lookupInvoiceNo, setLookupInvoiceNo] = useState("");

  if (!canAccess) {
    return (
      <p class="home-access-denied">
        You do not have permission to view{" "}
        {variant === "bottled" ? "Bottle Oil sales" : "sales invoices"}.
      </p>
    );
  }

  const posTabLabel =
    variant === "bottled" ? "Bottle Oil sales" : "Sales screen";
  const listTitle =
    variant === "bottled" ? "Bottle Oil invoices" : "Sales invoices";

  function openInvoice(invoiceNo: string) {
    setLookupInvoiceNo(invoiceNo);
    setView(canUsePos ? "pos" : "list");
  }

  return (
    <div class="sales-screen">
      <div class="sales-tabs">
        {canUsePos ? (
          <button
            type="button"
            class={`sales-tab${view === "pos" ? " is-active" : ""}`}
            onClick={() => setView("pos")}
          >
            {posTabLabel}
          </button>
        ) : null}
        <button
          type="button"
          class={`sales-tab${view === "list" ? " is-active" : ""}`}
          onClick={() => setView("list")}
        >
          Invoice list
        </button>
      </div>

      {view === "pos" && canUsePos ? (
        <SalesClient
          key={lookupInvoiceNo || "new"}
          user={user}
          permissions={permissions}
          variant={variant}
          initialInvoiceNo={lookupInvoiceNo}
          onOpenList={() => setView("list")}
        />
      ) : (
        <SalesList
          variant={variant}
          listTitle={listTitle}
          productMode={saleProductModeForVariant(variant)}
          onOpenInvoice={openInvoice}
          onOpenPos={
            canUsePos
              ? () => {
                  setLookupInvoiceNo("");
                  setView("pos");
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
