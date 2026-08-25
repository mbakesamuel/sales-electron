export interface SchemaRoute {
  id: string;
  label: string;
  table: string;
  description: string;
}

export interface SchemaRouteGroup {
  id: string;
  label: string;
  routes: SchemaRoute[];
}

export interface SchemaRouteSection {
  id: string;
  label: string;
  routes: SchemaRoute[];
  groups?: SchemaRouteGroup[];
}

export const SCHEMA_ROUTE_SECTIONS: SchemaRouteSection[] = [
  {
    id: "organization",
    label: "General Parameters",
    routes: [
      {
        id: "company-settings",
        label: "App settings",
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
        description:
          "Open and close calendar months for the current financial year.",
      },
      {
        id: "commercial-services",
        label: "Commercial services",
        table: "CommercialService",
        description: "Commercial service sites and modules.",
      },
      {
        id: "sales-points",
        label: "Collection points",
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
        description: "Assign locations to collection points.",
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
        id: "carry-forward-stock",
        label: "Opening Stock balances",
        table: "StockBalance",
        description:
          "Enter opening / carried-forward on-hand quantities by collection point and location.",
      },
      {
        id: "stock",
        label: "Stock",
        table: "StockBalance",
        description:
          "Manage bulk (non-bottled) stock balance, movements, receipts, transfers, and adjustments.",
      },
      {
        id: "bottled-stock",
        label: "Bottled Stock",
        table: "StockBalance",
        description:
          "Bin card ledger, transfers, and adjustments for bottled products.",
      },
      {
        id: "stock-validation",
        label: "Stock validation",
        table: "StockTransfer",
        description:
          "Review and validate draft stock receipts, transfers, and adjustments.",
      },
    ],
  },
  {
    id: "delivery",
    label: "Delivery Order",
    routes: [
      {
        id: "carry-forward-commitments",
        label: "Opening commitments",
        table: "DeliveryOrder",
        description:
          "Enter opening / carried-forward customer commitments by product and collection point.",
      },
      {
        id: "delivery-orders",
        label: "Delivery Orders",
        table: "DeliveryOrder",
        description: "Create and manage delivery orders.",
      },
      {
        id: "delivery-order-tracking",
        label: "DO tracking",
        table: "DeliveryOrder",
        description:
          "Track a delivery order by number: commitment, lifts, and remaining.",
      },
      {
        id: "delivery-order-transfer",
        label: "Transfer DO balance",
        table: "DeliveryOrder",
        description:
          "Move remaining DO commitment from one collection point to another.",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    routes: [
      {
        id: "sales",
        label: "Sales Invoicing",
        table: "Sale",
        description: "Create and manage loose-product sales invoices (POS screen).",
      },
      {
        id: "bottle-oil-sales",
        label: "Bottle Oil sales",
        table: "Sale",
        description: "Create and manage bottled palm-oil sales invoices.",
      },
      {
        id: "sales-validation",
        label: "Sales validation",
        table: "Sale",
        description: "Review and validate pending sales invoices.",
      },
    ],
  },
  (() => {
    const dailyRoutes: SchemaRoute[] = [
      {
        id: "daily-sales-report",
        label: "Daily sales report",
        table: "Sale",
        description:
          "Daily sales by product with DO details and customer-type summary.",
      },
    ];
    const weeklyRoutes: SchemaRoute[] = [
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
        description: "Stock by collection point and storage location.",
      },
      {
        id: "commitment-report",
        label: "Commitment report",
        table: "DeliveryOrder",
        description:
          "Outstanding delivery-order commitments by customer and collection point.",
      },
      {
        id: "bottle-oil-stock-sales-report",
        label: "Bottle Oil stock & sales",
        table: "StockBalance",
        description:
          "Bottled palm oil stock by collection point and monthly sales to date.",
      },
      {
        id: "bottled-weekly-issues-report",
        label: "Bottled Oil Issues",
        table: "Sale",
        description:
          "Bottled palm oil issues Mon–Fri by payment method, with MTD and YTD summary.",
      },
      {
        id: "sales-delivery-report",
        label: "Sales/Delivery By Product",
        table: "Sale",
        description: "Weekly sales and deliveries by customer category.",
      },
    ];
    const monthlyRoutes: SchemaRoute[] = [
      {
        id: "monthly-delivery-report-h1",
        label: "Monthly Delivery By Product/Cust Category (Jan–Jun)",
        table: "Sale",
        description: "Monthly deliveries and value for January through June.",
      },
      {
        id: "monthly-delivery-report-h2",
        label: "Monthly delivery (Jul–Dec)",
        table: "Sale",
        description: "Monthly deliveries and value for July through December.",
      },
      {
        id: "monthly-stock-reconciliation-report",
        label: "Stock reconciliation",
        table: "StockBalance",
        description:
          "Open-month LPO opening/reception/issues reconciliation with BPO and palm-kernel rows.",
      },
      {
        id: "monthly-payment-delivery-report",
        label: "Palm Oil Payment/Delivery",
        table: "Sale",
        description:
          "Open-month weekly bottled (Payments) vs other-product (Deliveries) sales kg and value.",
      },
      {
        id: "monthly-deliveries-by-destination-report",
        label: "Palm Oil Deliveries/Destination",
        table: "Sale",
        description:
          "Open-month weekly non-bottled deliveries (kg) by customer-type destination.",
      },
      {
        id: "monthly-palm-oil-sales-report",
        label: "Monthly By Month Palm Oil Sales",
        table: "Sale",
        description:
          "Full-year LPO by destination and BPO in tons and '000 FRS (taxes excluded).",
      },
      {
        id: "revenue-taxes-report",
        label: "Revenue & taxes",
        table: "Sale",
        description:
          "Validated invoice net, VAT, sales tax, and gross for the open month or FY to date.",
      },
      {
        id: "industry-product-monthly-sales-report",
        label: "Industry Product Monthly sales",
        table: "Sale",
        description:
          "Full-year Industry sales by collection point for each non-LPO, non-bottled product (tons and '000 FRS).",
      },
      {
        id: "bottled-palm-oil-sales-return-report",
        label: "Bottled Palm Oil Stock Reconciliation",
        table: "Sale",
        description:
          "Open-month bottled B/F, receptions, cash/PR issues, and balance by pack (qty, kg, value without taxes).",
      },
      {
        id: "other-product-sales-deliveries-report",
        label: "Other Products Sales/Deliveries",
        table: "Sale",
        description:
          "Open-month non-LPO / non-bottled sales by collection point and product (deliveries kg and F.CFA without taxes).",
      },
    ];
    const groups: SchemaRouteGroup[] = [
      { id: "daily", label: "Daily", routes: dailyRoutes },
      { id: "weekly", label: "Weekly", routes: weeklyRoutes },
      { id: "monthly", label: "Monthly", routes: monthlyRoutes },
    ];
    return {
      id: "reports",
      label: "Reports",
      groups,
      routes: groups.flatMap((group) => group.routes),
    };
  })(),
  {
    id: "users-access",
    label: "Users & access",
    routes: [
      {
        id: "users",
        label: "Manage Users",
        table: "User",
        description: "Application user accounts.",
      },
      {
        id: "roles",
        label: "Manage roles",
        table: "",
        description: "Create, rename, and delete application roles.",
      },
      {
        id: "role-permissions",
        label: "Role permissions",
        table: "",
        description: "Configure module access and special actions for each role.",
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
