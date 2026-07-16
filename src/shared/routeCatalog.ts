export interface RouteDefinition {
  id: string;
  label: string;
  sectionId: string;
  table?: string;
}

export const ROUTE_DEFINITIONS: RouteDefinition[] = [
  { id: "sales", label: "Sales Invoice", sectionId: "sales", table: "Sale" },
  { id: "customers", label: "Customers", sectionId: "customers", table: "Customer" },
  {
    id: "customer-types",
    label: "Customer types",
    sectionId: "customers",
    table: "CustomerTypeDefinition",
  },
  { id: "products", label: "Products", sectionId: "products", table: "Product" },
  {
    id: "product-categories",
    label: "Categories",
    sectionId: "products",
    table: "ProductCat",
  },
  {
    id: "unit-prices",
    label: "Product unit prices",
    sectionId: "products",
    table: "ProductUnitPriceSchedule",
  },
  {
    id: "sales-budgets",
    label: "Sales budgets",
    sectionId: "products",
    table: "ProductSalesBudget",
  },
  {
    id: "budget-phase-profiles",
    label: "Budget phase profiles",
    sectionId: "products",
    table: "ProductSalesBudgetMonthPhaseProfile",
  },
  {
    id: "sales-budget",
    label: "Sales budget phasing",
    sectionId: "products",
    table: "ProductSalesBudget",
  },
  {
    id: "sales-budget-monthly-crosstab",
    label: "Sales budget phasing (monthly)",
    sectionId: "products",
  },
  {
    id: "sales-budget-weekly-crosstab",
    label: "Sales budget phasing (weekly)",
    sectionId: "products",
  },
  {
    id: "delivery-orders",
    label: "Delivery orders",
    sectionId: "delivery",
    table: "DeliveryOrder",
  },
  {
    id: "vehicle-consignment-notes",
    label: "Consignment notes",
    sectionId: "delivery",
    table: "VehicleConsignmentNote",
  },
  { id: "stock-balance", label: "Stock balance", sectionId: "inventory", table: "StockBalance" },
  {
    id: "stock-commitment-report",
    label: "Stock & commitment report",
    sectionId: "inventory",
  },
  {
    id: "stock-report",
    label: "Stock report",
    sectionId: "inventory",
  },
  {
    id: "commitment-report",
    label: "Commitment report",
    sectionId: "inventory",
  },
  {
    id: "bottle-oil-stock-sales-report",
    label: "Bottle oil stock & sales",
    sectionId: "inventory",
  },
  {
    id: "bottled-weekly-issues-report",
    label: "Bottled weekly issues",
    sectionId: "inventory",
  },
  {
    id: "sales-delivery-report",
    label: "Sales / delivery report",
    sectionId: "inventory",
  },
  {
    id: "monthly-delivery-report-h1",
    label: "Monthly delivery (Jan–Jun)",
    sectionId: "inventory",
  },
  {
    id: "monthly-delivery-report-h2",
    label: "Monthly delivery (Jul–Dec)",
    sectionId: "inventory",
  },
  {
    id: "stock-movements",
    label: "Stock movements",
    sectionId: "inventory",
    table: "StockMovement",
  },
  {
    id: "stock-receipts",
    label: "Stock receipts",
    sectionId: "inventory",
    table: "StockReceipt",
  },
  {
    id: "stock-receipt-lines",
    label: "Receipt lines",
    sectionId: "inventory",
    table: "StockReceiptLine",
  },
  {
    id: "stock-transfers",
    label: "Stock transfers",
    sectionId: "inventory",
    table: "StockTransfer",
  },
  {
    id: "stock-transfer-lines",
    label: "Transfer lines",
    sectionId: "inventory",
    table: "StockTransferLine",
  },
  {
    id: "stock-adjustments",
    label: "Stock adjustments",
    sectionId: "inventory",
    table: "StockAdjustment",
  },
  {
    id: "stock-adjustment-lines",
    label: "Adjustment lines",
    sectionId: "inventory",
    table: "StockAdjustmentLine",
  },
  {
    id: "commercial-services",
    label: "Commercial services",
    sectionId: "organization",
    table: "CommercialService",
  },
  { id: "sales-points", label: "Sales points", sectionId: "organization", table: "SalesPoint" },
  { id: "locations", label: "Locations", sectionId: "organization", table: "Location" },
  {
    id: "storage-locations",
    label: "Storage locations",
    sectionId: "organization",
    table: "StorageLocation",
  },
  {
    id: "company-settings",
    label: "Company settings",
    sectionId: "organization",
    table: "CompanySettings",
  },
  {
    id: "tax-rate-schedules",
    label: "Tax rates",
    sectionId: "tax-finance",
    table: "TaxRateSchedule",
  },
  { id: "tax-regimes", label: "Tax regimes", sectionId: "tax-finance", table: "TaxRegime" },
  {
    id: "payment-methods",
    label: "Payment methods",
    sectionId: "tax-finance",
    table: "PaymentMethodDefinition",
  },
  {
    id: "financial-year-periods",
    label: "Financial years",
    sectionId: "organization",
    table: "FinancialYearPeriod",
  },
  {
    id: "financial-months",
    label: "Financial months",
    sectionId: "organization",
    table: "FinancialMonth",
  },
  { id: "users", label: "Users", sectionId: "users-access", table: "User" },
  {
    id: "role-permissions",
    label: "Role permissions",
    sectionId: "users-access",
  },
];

export const ROUTE_IDS = ROUTE_DEFINITIONS.map((route) => route.id);

export const TABLE_TO_ROUTE_ID: Record<string, string> = Object.fromEntries(
  ROUTE_DEFINITIONS.filter((route) => route.table).map((route) => [route.table!, route.id]),
);

export function getRouteLabel(routeId: string): string {
  return ROUTE_DEFINITIONS.find((route) => route.id === routeId)?.label ?? routeId;
}
