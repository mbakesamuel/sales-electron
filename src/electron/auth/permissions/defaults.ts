import type { PermissionActionKey } from "../../../shared/permissions.types.js";
import { ROUTE_IDS } from "../../../shared/routeCatalog.js";
import type { RouteAccess } from "../../../shared/roles.js";
import { USER_ROLES } from "../../../shared/roles.js";

type RouteMatrix = Record<string, RouteAccess>;
type ActionMatrix = Record<PermissionActionKey, boolean>;

const ROUTE_GROUPS = {
  operations: ["sales", "bottle-oil-sales", "sales-validation", "delivery-orders", "delivery-order-tracking", "delivery-order-transfer", "carry-forward-commitments", "vehicle-consignment-notes"],
  customerOps: ["customers"],
  productConfig: [
    "products",
    "product-categories",
    "unit-prices",
    "sales-budgets",
    "budget-phase-profiles",
    "sales-budget-monthly-crosstab",
    "sales-budget-weekly-crosstab",
  ],
  inventoryWrite: [
    "stock",
    "bottled-stock",
    "stock-validation",
    "stock-receipts",
    "stock-receipt-lines",
    "stock-transfers",
    "stock-transfer-lines",
    "stock-adjustments",
    "stock-adjustment-lines",
    "carry-forward-stock",
  ],
  inventoryRead: [
    "stock",
    "stock-balance",
    "stock-movements",
    "carry-forward-stock",
    "stock-bin-card",
    "stock-commitment-report",
    "stock-report",
    "commitment-report",
    "bottle-oil-stock-sales-report",
    "bottled-weekly-issues-report",
    "sales-delivery-report",
    "daily-sales-report",
    "monthly-delivery-report-h1",
    "monthly-delivery-report-h2",
    "monthly-stock-reconciliation-report",
    "monthly-payment-delivery-report",
    "monthly-deliveries-by-destination-report",
    "monthly-palm-oil-sales-report",
    "revenue-taxes-report",
    "industry-product-monthly-sales-report",
    "bottled-palm-oil-sales-return-report",
    "other-product-sales-deliveries-report",
  ],
  organization: [
    "commercial-services",
    "sales-points",
    "locations",
    "storage-locations",
    "company-settings",
    "report-settings",
    "financial-year-periods",
    "financial-months",
  ],
  taxFinance: [
    "tax-rate-schedules",
    "tax-regimes",
    "payment-methods",
  ],
  usersAccess: ["users"],
} as const;

function buildRouteAccess(
  routeIds: readonly string[],
  level: Exclude<RouteAccess, "none"> = "write",
): RouteMatrix {
  const allowed = new Set(routeIds);
  return Object.fromEntries(
    ROUTE_IDS.map((routeId) => [routeId, allowed.has(routeId) ? level : "none"]),
  ) as RouteMatrix;
}

function buildDefaultRouteMatrix(): Record<string, RouteMatrix> {
  const usersAccess = new Set<string>(ROUTE_GROUPS.usersAccess);

  return {
    ADMIN: Object.fromEntries(ROUTE_IDS.map((routeId) => [routeId, "write"])) as RouteMatrix,
    MANAGER: Object.fromEntries(
      ROUTE_IDS.map((routeId) => [
        routeId,
        usersAccess.has(routeId) ? "none" : "write",
      ]),
    ) as RouteMatrix,
    SENIOR_SALES_SUPERVISOR: buildRouteAccess([
      ...ROUTE_GROUPS.operations,
      ...ROUTE_GROUPS.customerOps,
      ...ROUTE_GROUPS.inventoryRead,
      ...ROUTE_GROUPS.inventoryWrite,
    ]),
    STATISTICS_CLERK: buildRouteAccess(
      [
        ...ROUTE_GROUPS.operations,
        "sales-budgets",
        "budget-phase-profiles",
        "sales-budget",
        "sales-budget-monthly-crosstab",
        "sales-budget-weekly-crosstab",
        ...ROUTE_GROUPS.inventoryRead,
        "financial-year-periods",
        "financial-months",
        "tax-rate-schedules",
        "tax-regimes",
      ],
      "read",
    ),
    STORE_KEEPER: buildRouteAccess([
      "bottled-stock",
      "bottle-oil-sales",
      "stock-commitment-report",
      "stock-report",
      "commitment-report",
      "bottle-oil-stock-sales-report",
      "bottled-weekly-issues-report",
    ]),
  };
}

function buildDefaultActionMatrix(): Record<string, ActionMatrix> {
  const stockDocumentActions = {
    draft_stock_receipts: true,
    post_stock_receipts: true,
    draft_stock_transfers: true,
    post_stock_transfers: true,
    draft_stock_adjustments: true,
    post_stock_adjustments: true,
    direct_post_stock_receipts: true,
    direct_post_stock_transfers: true,
    validate_stock_documents: true,
  } as const;

  const stockDocumentNone = {
    draft_stock_receipts: false,
    post_stock_receipts: false,
    draft_stock_transfers: false,
    post_stock_transfers: false,
    draft_stock_adjustments: false,
    post_stock_adjustments: false,
    direct_post_stock_receipts: false,
    direct_post_stock_transfers: false,
    validate_stock_documents: false,
  } as const;

  const validator: ActionMatrix = {
    validate_sales: true,
    direct_validate_sales: false,
    validate_delivery_orders: true,
    cancel_validated_delivery_order: false,
    transfer_delivery_order_balance: true,
    validate_vehicle_consignment_notes: true,
    manage_permissions: false,
    ...stockDocumentActions,
  };

  const manager: ActionMatrix = {
    ...validator,
    cancel_validated_delivery_order: true,
    direct_post_stock_receipts: true,
    direct_post_stock_transfers: true,
  };

  const admin: ActionMatrix = {
    ...manager,
    manage_permissions: true,
  };

  const seniorSupervisor: ActionMatrix = {
    ...validator,
    direct_post_stock_receipts: false,
    direct_post_stock_transfers: false,
  };

  const none: ActionMatrix = {
    validate_sales: false,
    direct_validate_sales: false,
    validate_delivery_orders: false,
    cancel_validated_delivery_order: false,
    transfer_delivery_order_balance: false,
    validate_vehicle_consignment_notes: false,
    manage_permissions: false,
    ...stockDocumentNone,
  };

  return {
    ADMIN: admin,
    MANAGER: manager,
    SENIOR_SALES_SUPERVISOR: seniorSupervisor,
    STATISTICS_CLERK: none,
    STORE_KEEPER: none,
  };
}

export function getDefaultRouteMatrix(): Record<string, RouteMatrix> {
  const matrix = buildDefaultRouteMatrix();
  for (const role of USER_ROLES) {
    matrix[role]["roles"] = role === "ADMIN" ? "write" : "none";
    matrix[role]["role-permissions"] =
      role === "ADMIN" ? "write" : "none";
  }
  return matrix;
}

export function getDefaultActionMatrix(): Record<string, ActionMatrix> {
  return buildDefaultActionMatrix();
}
