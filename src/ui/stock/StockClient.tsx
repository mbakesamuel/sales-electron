import { useMemo, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import {
  getVisibleStockTabs,
  isStockTabReadOnly,
  type StockTabId,
} from "../../shared/stockModule.ts";
import type { AuthUser } from "../auth/session.ts";
import type { StockBootstrap } from "../../shared/stock.types.ts";
import { OnHandTab } from "./OnHandTab.tsx";
import { MovementsTab } from "./MovementsTab.tsx";
import { ReceiptsTab } from "./ReceiptsTab.tsx";
import { TransfersTab } from "./TransfersTab.tsx";
import { AdjustmentsTab } from "./AdjustmentsTab.tsx";
import "./StockScreen.css";

type TabId = "on-hand" | "movements" | "receipts" | "transfers" | "adjustments";
type Banner = { type: "ok" | "error"; text: string } | null;

const TAB_DEFINITIONS: { id: TabId; stockTabId: StockTabId; label: string }[] = [
  { id: "on-hand", stockTabId: "balance", label: "On hand" },
  { id: "movements", stockTabId: "movements", label: "Movements" },
  { id: "receipts", stockTabId: "receipts", label: "Receipts" },
  { id: "transfers", stockTabId: "transfers", label: "Transfers" },
  { id: "adjustments", stockTabId: "adjustments", label: "Adjustments" },
];

interface StockClientProps {
  bootstrap: StockBootstrap;
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  onRefresh: () => void | Promise<void>;
  onOpenBinCard?: () => void;
}

export function StockClient({
  bootstrap,
  user,
  permissions,
  onRefresh,
  onOpenBinCard,
}: StockClientProps) {
  const visibleTabs = useMemo(
    () =>
      TAB_DEFINITIONS.filter((tab) =>
        getVisibleStockTabs(permissions).includes(tab.stockTabId),
      ),
    [permissions],
  );

  const [tab, setTab] = useState<TabId>(() => visibleTabs[0]?.id ?? "on-hand");
  const [banner, setBanner] = useState<Banner>(null);

  const activeTab = visibleTabs.some((item) => item.id === tab)
    ? tab
    : (visibleTabs[0]?.id ?? "on-hand");

  const activeStockTabId =
    TAB_DEFINITIONS.find((item) => item.id === activeTab)?.stockTabId ?? "balance";
  const tabReadOnly = isStockTabReadOnly(permissions, activeStockTabId);

  function announceOk(text: string) {
    setBanner({ type: "ok", text });
    void onRefresh();
  }

  function announceErr(text: string) {
    setBanner({ type: "error", text });
  }

  if (visibleTabs.length === 0) {
    return (
      <p class="home-access-denied">You do not have permission to view stock data.</p>
    );
  }

  return (
    <div class="stock-screen">
      <header class="stock-header">
        <h1>Stock management</h1>
        <p class="stock-header-subtitle">
          Per sales-point on-hand quantities, receipts, transfers, sales deductions, and
          adjustments. Every operation is recorded with the actor and timestamp on the movement
          ledger.
        </p>
        {onOpenBinCard ? (
          <p class="stock-header-subtitle">
            <button type="button" class="scr-btn scr-btn-secondary" onClick={onOpenBinCard}>
              Open bin card
            </button>
          </p>
        ) : null}
      </header>

      {banner ? (
        <div class={`stock-banner stock-banner-${banner.type}`}>{banner.text}</div>
      ) : null}

      <nav class="stock-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            class={`stock-tab${activeTab === t.id ? " is-active" : ""}`}
            onClick={() => {
              setBanner(null);
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div class="stock-tab-panel">
        {activeTab === "on-hand" ? (
          <OnHandTab
            salesPoints={bootstrap.salesPoints}
            scopedSalesPointId={bootstrap.scopedSalesPointId}
            rows={bootstrap.onHand}
          />
        ) : null}

        {activeTab === "movements" ? (
          <MovementsTab
            rows={bootstrap.movements}
            salesPoints={bootstrap.salesPoints}
            scopedSalesPointId={bootstrap.scopedSalesPointId}
          />
        ) : null}

        {activeTab === "receipts" ? (
          <ReceiptsTab
            rows={bootstrap.receipts}
            salesPoints={bootstrap.salesPoints}
            storageLocations={bootstrap.storageLocations}
            products={bootstrap.products}
            scopedSalesPointId={bootstrap.scopedSalesPointId}
            canPost={!tabReadOnly && bootstrap.canManageReceipts}
            canCancel={!tabReadOnly && bootstrap.canCancelDocuments}
            canDraft={!tabReadOnly && bootstrap.canDraftReceipts}
            userId={user.id}
            onOk={announceOk}
            onErr={announceErr}
          />
        ) : null}

        {activeTab === "transfers" ? (
          <TransfersTab
            rows={bootstrap.transfers}
            salesPoints={bootstrap.salesPoints}
            storageLocations={bootstrap.storageLocations}
            products={bootstrap.products}
            onHand={bootstrap.onHand}
            scopedSalesPointId={bootstrap.scopedSalesPointId}
            canDispatch={!tabReadOnly && bootstrap.canDispatchTransfers}
            canReceive={!tabReadOnly && bootstrap.canReceiveTransfers}
            canCancel={!tabReadOnly && bootstrap.canCancelDocuments}
            canDraft={!tabReadOnly && bootstrap.canDraftTransfers}
            userId={user.id}
            onOk={announceOk}
            onErr={announceErr}
          />
        ) : null}

        {activeTab === "adjustments" ? (
          <AdjustmentsTab
            rows={bootstrap.adjustments}
            salesPoints={bootstrap.salesPoints}
            storageLocations={bootstrap.storageLocations}
            products={bootstrap.products}
            onHand={bootstrap.onHand}
            scopedSalesPointId={bootstrap.scopedSalesPointId}
            canPost={!tabReadOnly && bootstrap.canPostAdjustments}
            canReclassify={!tabReadOnly && bootstrap.canReclassifyStock}
            canCancel={!tabReadOnly && bootstrap.canCancelDocuments}
            canDraft={!tabReadOnly && bootstrap.canDraftAdjustments}
            userId={user.id}
            onOk={announceOk}
            onErr={announceErr}
          />
        ) : null}
      </div>
    </div>
  );
}
