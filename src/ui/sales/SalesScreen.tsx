import { useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import {
  canWriteRouteFromSnapshot,
} from "../../shared/permissionUtils.ts";
import type { AuthUser } from "../auth/session.ts";
import { SalesClient } from "./SalesClient.tsx";
import { SalesList } from "./SalesList.tsx";

interface SalesScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  readOnly?: boolean;
}

type SalesView = "pos" | "list";

export function SalesScreen({ user, permissions, readOnly = false }: SalesScreenProps) {
  const canUsePos =
    canWriteRouteFromSnapshot(permissions, "sales") && !readOnly;
  const [view, setView] = useState<SalesView>(canUsePos ? "pos" : "list");
  const [lookupInvoiceNo, setLookupInvoiceNo] = useState("");

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
            Sales screen
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
          initialInvoiceNo={lookupInvoiceNo}
          onOpenList={() => setView("list")}
        />
      ) : (
        <SalesList
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
