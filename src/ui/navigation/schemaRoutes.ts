export interface SchemaRoute {
  id: string;
  label: string;
  table: string;
  description: string;
}

export interface SchemaRouteSection {
  id: string;
  label: string;
  routes: SchemaRoute[];
}

export const SCHEMA_ROUTE_SECTIONS: SchemaRouteSection[] = [
  {
    id: "organization",
    label: "General Parameters",
    routes: [
      {
        id: "company-settings",
        label:"App settings",
        table: "CompanySettings",
        description: "Company-wide configuration.",
      },
      {
        id: "report-settings",
        label: "Report settings",
        table: "CompanySettings",
        description: "Display options for stock and delivery reports.",
      },
      {
        id: "financial-year-periods",
        label: "Financial years",
        table: "FinancialYearPeriod",
        description: "Open and closed financial years.",
      },
      {
        id: "financial-months",
        label: "Financial months",
        table: "FinancialMonth",
        description: "Open and close calendar months for the current financial year.",
      },
      {
        id: "commercial-services",
        label: "Commercial services",
        table: "CommercialService",
        description: "Commercial service sites and modules.",
      },
      {
        id: "sales-points",
        label: "Sales points",
        table: "SalesPoint",
        description: "Sales outlet locations.",
      },
      {
        id: "locations",
        label: "Locations",
        table: "Location",
        description: "Reusable location name definitions.",
      },
      {
        id: "storage-locations",
        label: "Storage locations",
        table: "StorageLocation",
        description: "Assign locations to sales points.",
      },
      {
        id: "payment-methods",
        label: "Payment methods",
        table: "PaymentMethodDefinition",
        description: "Accepted payment methods.",
      },
      {
        id: "tax-regimes",
        label: "Tax regimes",
        table: "TaxRegime",
        description: "Actual vs Simplified tax regimes.",
      },
      {
        id: "tax-rate-schedules",
        label: "Tax rates",
        table: "TaxRateSchedule",
        description: "Date-effective VAT and sales-tax rates.",
      },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    routes: [
      {
        id: "customers",
        label: "Customers",
        table: "Customer",
        description: "Customer accounts and profiles.",
      },
      {
        id: "customer-types",
        label: "Customer types",
        table: "CustomerTypeDefinition",
        description: "Customer type definitions.",
      },
    ],
  },
  {
    id: "products",
    label: "Products",
    routes: [
      {
        id: "products",
        label: "Products",
        table: "Product",
        description: "Product catalog.",
      },
      {
        id: "product-categories",
        label: "Categories",
        table: "ProductCat",
        description: "Product categories and codes.",
      },
      {
        id: "unit-prices",
        label: "ProductUnit prices",
        table: "ProductUnitPriceSchedule",
        description: "Scheduled product unit prices.",
      },
    ],
  },
  {
    id: "sales-budget",
    label: "Sales budget",
    routes: [
      {
        id: "sales-budget",
        label: "Sales budget phasing",
        table: "ProductSalesBudget",
        description: "Set annual quantities and monthly phasing profiles.",
      },
      {
        id: "sales-budget-monthly-crosstab",
        label: "Sales budget phasing (monthly)",
        table: "ProductSalesBudget",
        description: "Monthly phased budget kg crosstab by product.",
      },
      {
        id: "sales-budget-weekly-crosstab",
        label: "Sales budget phasing (weekly)",
        table: "ProductSalesBudget",
        description: "Weekly phased budget kg crosstab by product and month.",
      },
    ],
  },
  {
    id: "inventory",
    label: "Stocks",
    routes: [
      {
        id: "stock",
        label: "Stock",
        table: "StockBalance",
        description:
          "Manage stock balance, movements, receipts, transfers, and adjustments.",
      },
      {
        id: "carry-forward-stock",
        label: "Opening Stock balances",
        table: "StockBalance",
        description:
          "Enter opening / carried-forward on-hand quantities by sales point and location.",
      },
    ],
  },
 
  {
    id: "delivery",
    label: "Delivery Order",
    routes: [
      {
        id: "delivery-orders",
        label: "Delivery orders",
        table: "DeliveryOrder",
        description: "Create and manage delivery orders.",
      },
      {
        id: "carry-forward-commitments",
        label: "Opening commitment balances",
        table: "DeliveryOrder",
        description:
          "Enter opening / carried-forward customer commitments by product and sales point.",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    routes: [
      {
        id: "sales",
        label: "Sales Invoice",
        table: "Sale",
        description: "Create and manage sales invoices (POS screen).",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    routes: [
      {
        id: "stock-commitment-report",
        label: "Stock summary report",
        table: "StockBalance",
        description:
          "Stock and delivery-order commitment report for management.",
      },
      {
        id: "stock-report",
        label: "Stock report",
        table: "StockBalance",
        description: "Stock by sales point and storage location.",
      },
      {
        id: "commitment-report",
        label: "Commitment report",
        table: "DeliveryOrder",
        description:
          "Outstanding delivery-order commitments by customer and sales point.",
      },
      {
        id: "bottle-oil-stock-sales-report",
        label: "Bottle oil stock & sales",
        table: "StockBalance",
        description:
          "Bottled palm oil stock by sales point and monthly sales to date.",
      },
      {
        id: "bottled-weekly-issues-report",
        label: "Bottled Sales Report",
        table: "Sale",
        description:
          "Bottled palm oil issues Mon–Fri by payment method, with MTD and YTD summary.",
      },
      {
        id: "sales-delivery-report",
        label: "Sales/delivery report",
        table: "Sale",
        description: "Weekly sales and deliveries by customer category.",
      },
      {
        id: "weekly-print-pack",
        label: "Weekly print pack",
        table: "StockBalance",
        description:
          "Select weekly management reports and export one combined PDF.",
      },
      {
        id: "monthly-delivery-report-h1",
        label: "Monthly delivery (Jan–Jun)",
        table: "Sale",
        description: "Monthly deliveries and value for January through June.",
      },
      {
        id: "monthly-delivery-report-h2",
        label: "Monthly delivery (Jul–Dec)",
        table: "Sale",
        description: "Monthly deliveries and value for July through December.",
      },
    ],
  },
  {
    id: "users-access",
    label: "Users & access",
    routes: [
      {
        id: "users",
        label: "Users",
        table: "User",
        description: "Application user accounts.",
      },
      {
        id: "role-permissions",
        label: "Role permissions",
        table: "",
        description: "Configure module access and actions per role.",
      },
    ],
  },
];

export const DEFAULT_ROUTE_ID = "overview";

export const OVERVIEW_ROUTE: SchemaRoute = {
  id: DEFAULT_ROUTE_ID,
  label: "Overview",
  table: "",
  description: "Welcome to Sales Electron. Select a module from the sidebar.",
};

export function findRouteById(routeId: string): SchemaRoute | null {
  if (routeId === DEFAULT_ROUTE_ID) {
    return OVERVIEW_ROUTE;
  }

  for (const section of SCHEMA_ROUTE_SECTIONS) {
    const route = section.routes.find((item) => item.id === routeId);
    if (route) {
      return route;
    }
  }

  return null;
}

export function getSectionIdForRoute(routeId: string): string | null {
  for (const section of SCHEMA_ROUTE_SECTIONS) {
    if (section.routes.some((route) => route.id === routeId)) {
      return section.id;
    }
  }

  return null;
}
