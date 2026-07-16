import type { RolePermissionsSnapshot } from "./permissions.types.js";
import type { RouteAccess } from "./roles.js";

export const STOCK_MODULE_ROUTE_IDS = [
  "stock-balance",
  "stock-movements",
  "stock-receipts",
  "stock-receipt-lines",
  "stock-transfers",
  "stock-transfer-lines",
  "stock-adjustments",
  "stock-adjustment-lines",
] as const;

export type StockTabId = "balance" | "movements" | "receipts" | "transfers" | "adjustments";

const STOCK_TAB_ROUTE_IDS: Record<StockTabId, readonly string[]> = {
  balance: ["stock-balance"],
  movements: ["stock-movements"],
  receipts: ["stock-receipts", "stock-receipt-lines"],
  transfers: ["stock-transfers", "stock-transfer-lines"],
  adjustments: ["stock-adjustments", "stock-adjustment-lines"],
};

export const STOCK_TAB_DEFINITIONS: ReadonlyArray<{
  id: StockTabId;
  label: string;
  headerTable: string;
  lineTable?: string;
  description: string;
  lineDescription?: string;
}> = [
  {
    id: "balance",
    label: "Balance",
    headerTable: "StockBalance",
    description: "Current stock levels by sales point, product, location, and condition.",
  },
  {
    id: "movements",
    label: "Movements",
    headerTable: "StockMovement",
    description: "Stock movement ledger across receipts, transfers, sales, and adjustments.",
  },
  {
    id: "receipts",
    label: "Receipts",
    headerTable: "StockReceipt",
    lineTable: "StockReceiptLine",
    description: "Inbound stock receipts.",
    lineDescription: "Line items on stock receipts.",
  },
  {
    id: "transfers",
    label: "Transfers",
    headerTable: "StockTransfer",
    lineTable: "StockTransferLine",
    description: "Transfers between sales points and storage locations.",
    lineDescription: "Line items on stock transfers.",
  },
  {
    id: "adjustments",
    label: "Adjustments",
    headerTable: "StockAdjustment",
    lineTable: "StockAdjustmentLine",
    description: "Manual stock adjustments.",
    lineDescription: "Line items on stock adjustments.",
  },
];

function getRouteAccess(snapshot: RolePermissionsSnapshot, routeId: string): RouteAccess {
  return snapshot.routes[routeId] ?? "none";
}

function canAccessRoute(snapshot: RolePermissionsSnapshot, routeId: string): boolean {
  return getRouteAccess(snapshot, routeId) !== "none";
}

function canWriteRoute(snapshot: RolePermissionsSnapshot, routeId: string): boolean {
  return getRouteAccess(snapshot, routeId) === "write";
}

function maxRouteAccess(levels: RouteAccess[]): RouteAccess {
  if (levels.includes("write")) {
    return "write";
  }
  if (levels.includes("read")) {
    return "read";
  }
  return "none";
}

export function canAccessStockModule(snapshot: RolePermissionsSnapshot): boolean {
  return STOCK_MODULE_ROUTE_IDS.some((routeId) => canAccessRoute(snapshot, routeId));
}

export function getStockModuleAccess(snapshot: RolePermissionsSnapshot): RouteAccess {
  return maxRouteAccess(
    STOCK_MODULE_ROUTE_IDS.map((routeId) => getRouteAccess(snapshot, routeId)),
  );
}

export function canAccessStockTab(
  snapshot: RolePermissionsSnapshot,
  tabId: StockTabId,
): boolean {
  return STOCK_TAB_ROUTE_IDS[tabId].some((routeId) => canAccessRoute(snapshot, routeId));
}

export function isStockTabReadOnly(
  snapshot: RolePermissionsSnapshot,
  tabId: StockTabId,
): boolean {
  const routeIds = STOCK_TAB_ROUTE_IDS[tabId];
  return !routeIds.some((routeId) => canWriteRoute(snapshot, routeId));
}

export function getVisibleStockTabs(snapshot: RolePermissionsSnapshot): StockTabId[] {
  return STOCK_TAB_DEFINITIONS.filter((tab) => canAccessStockTab(snapshot, tab.id)).map(
    (tab) => tab.id,
  );
}
