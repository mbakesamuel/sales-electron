import { useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import {
  canPerformActionFromSnapshot,
  canWriteRouteFromSnapshot,
} from "../../shared/permissionUtils.ts";
import type { AuthUser } from "../auth/session.ts";
import { DeliveryOrdersClient } from "./DeliveryOrdersClient.tsx";
import { DeliveryOrdersList } from "./DeliveryOrdersList.tsx";
import { ValidationQueueClient } from "./validation-queue/ValidationQueueClient.tsx";

interface DeliveryOrdersScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  readOnly?: boolean;
}

type DeliveryOrdersView = "screen" | "list" | "queue";

export function DeliveryOrdersScreen({
  user,
  permissions,
  readOnly = false,
}: DeliveryOrdersScreenProps) {
  const canUseScreen =
    canWriteRouteFromSnapshot(permissions, "delivery-orders") && !readOnly;
  const canValidate = canPerformActionFromSnapshot(
    permissions,
    "validate_delivery_orders",
  );
  const [view, setView] = useState<DeliveryOrdersView>(canUseScreen ? "screen" : "list");
  const [lookupNo, setLookupNo] = useState("");

  function openOrder(deliveryOrderNo: string) {
    setLookupNo(deliveryOrderNo);
    setView(canUseScreen ? "screen" : "list");
  }

  return (
    <div class="sales-screen">
      <div class="sales-tabs">
        {canUseScreen ? (
          <button
            type="button"
            class={`sales-tab${view === "screen" ? " is-active" : ""}`}
            onClick={() => setView("screen")}
          >
            Delivery order
          </button>
        ) : null}
        <button
          type="button"
          class={`sales-tab${view === "list" ? " is-active" : ""}`}
          onClick={() => setView("list")}
        >
          DO list
        </button>
        {canValidate ? (
          <button
            type="button"
            class={`sales-tab${view === "queue" ? " is-active" : ""}`}
            onClick={() => setView("queue")}
          >
            Validation queue
          </button>
        ) : null}
      </div>

      {view === "screen" && canUseScreen ? (
        <DeliveryOrdersClient
          key={lookupNo || "new"}
          user={user}
          permissions={permissions}
          initialLookupNo={lookupNo}
          onOpenList={() => setView("list")}
          onOpenQueue={() => setView("queue")}
        />
      ) : null}

      {view === "list" ? (
        <DeliveryOrdersList
          onOpenOrder={openOrder}
          onOpenScreen={
            canUseScreen
              ? () => {
                  setLookupNo("");
                  setView("screen");
                }
              : undefined
          }
        />
      ) : null}

      {view === "queue" && canValidate ? (
        <ValidationQueueClient user={user} onOpenOrder={openOrder} />
      ) : null}
    </div>
  );
}
