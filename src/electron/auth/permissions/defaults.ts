import type { PermissionActionKey } from "../../../shared/permissions.types.js";
import { ROUTE_IDS } from "../../../shared/routeCatalog.js";
import type { RouteAccess } from "../../../shared/roles.js";
import { USER_ROLES } from "../../../shared/roles.js";

type RouteMatrix = Record<string, RouteAccess>;
type ActionMatrix = Record<PermissionActionKey, boolean>;

const ROUTE_GROUPS = {
  operations: ["sales", "delivery-orders", "carry-forward-commitments", "vehicle-consignment-notes"],
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
    "stock-receipts",
    "stock-receipt-lines",
    "stock-transfers",
    "stock-transfer-lines",
    "stock-adjustments",
    "stock-adjustment-lines",
    "carry-forward-stock",
  ],
  inventoryRead: [
    "stock-balance",
    "stock-movements",
    "carry-forward-stock",
    "stock-commitment-report",
    "stock-report",
    "commitment-report",
    "bottle-oil-stock-sales-report",
    "bottled-weekly-issues-report",
    "sales-delivery-report",
    "weekly-print-pack",
    "monthly-delivery-report-h1",
    "monthly-delivery-report-h2",
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
    STATISTICS_SUPERVISOR: buildRouteAccess(
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
    SALES_CLERK: buildRouteAccess([
      ...ROUTE_GROUPS.operations,
      ...ROUTE_GROUPS.customerOps,
      "stock-balance",
      "stock-commitment-report",
      "stock-report",
      "commitment-report",
      "bottle-oil-stock-sales-report",
      "bottled-weekly-issues-report",
      "sales-delivery-report",
      "weekly-print-pack",
      "monthly-delivery-report-h1",
      "monthly-delivery-report-h2",
    ]),
  };
}

function buildDefaultActionMatrix(): Record<string, ActionMatrix> {
  const validator: ActionMatrix = {
    validate_sales: true,
    validate_delivery_orders: true,
    cancel_validated_delivery_order: false,
    manage_permissions: false,
  };

  const manager: ActionMatrix = {
    ...validator,
    cancel_validated_delivery_order: true,
  };

  const admin: ActionMatrix = {
    ...manager,
    manage_permissions: true,
  };

  const none: ActionMatrix = {
    validate_sales: false,
    validate_delivery_orders: false,
    cancel_validated_delivery_order: false,
    manage_permissions: false,
  };

  return {
    ADMIN: admin,
    MANAGER: manager,
    SENIOR_SALES_SUPERVISOR: validator,
    STATISTICS_SUPERVISOR: none,
    SALES_CLERK: none,
  };
}

export function getDefaultRouteMatrix(): Record<string, RouteMatrix> {
  const matrix = buildDefaultRouteMatrix();
  for (const role of USER_ROLES) {
    matrix[role]["role-permissions"] =
      role === "ADMIN" ? "write" : "none";
  }
  return matrix;
}

export function getDefaultActionMatrix(): Record<string, ActionMatrix> {
  return buildDefaultActionMatrix();
}
