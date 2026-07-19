import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Layers,
  LayoutDashboard,
  List,
  LogOut,
  MapPin,
  Package,
  PackagePlus,
  Percent,
  Receipt,
  Scale,
  Settings,
  SlidersHorizontal,
  Store,
  Tags,
  Target,
  Truck,
  User,
  Users,
  Warehouse,
} from "lucide-react";

export const OVERVIEW_ICON: LucideIcon = LayoutDashboard;
export const LOGOUT_ICON: LucideIcon = LogOut;

export const SECTION_ICONS: Record<string, LucideIcon> = {
  sales: Receipt,
  customers: Users,
  products: Package,
  "sales-budget": Target,
  delivery: Truck,
  inventory: Warehouse,
  reports: FileBarChart,
  organization: Settings,
  "users-access": KeyRound,
};

export const ROUTE_ICONS: Record<string, LucideIcon> = {
  sales: FileText,
  customers: Users,
  "customer-types": Tags,
  products: Package,
  "product-categories": Layers,
  "unit-prices": CircleDollarSign,
  "sales-budgets": Target,
  "budget-phase-profiles": CalendarRange,
  "sales-budget": Target,
  "sales-budget-monthly-crosstab": FileSpreadsheet,
  "sales-budget-weekly-crosstab": FileSpreadsheet,
  "delivery-orders": ClipboardList,
  "carry-forward-commitments": ClipboardList,
  "vehicle-consignment-notes": FileSpreadsheet,
  stock: Warehouse,
  "stock-balance": Boxes,
  "stock-commitment-report": FileSpreadsheet,
  "stock-report": FileSpreadsheet,
  "commitment-report": ClipboardList,
  "bottle-oil-stock-sales-report": FileSpreadsheet,
  "bottled-weekly-issues-report": FileSpreadsheet,
  "sales-delivery-report": Truck,
  "weekly-print-pack": FileSpreadsheet,
  "monthly-delivery-report-h1": FileSpreadsheet,
  "monthly-delivery-report-h2": FileSpreadsheet,
  "stock-movements": ArrowLeftRight,
  "stock-receipts": PackagePlus,
  "stock-receipt-lines": List,
  "stock-transfers": Truck,
  "stock-transfer-lines": List,
  "stock-adjustments": SlidersHorizontal,
  "stock-adjustment-lines": List,
  "commercial-services": Building2,
  "sales-points": Store,
  locations: MapPin,
  "storage-locations": Warehouse,
  "company-settings": Settings,
  "tax-rate-schedules": Percent,
  "tax-regimes": Scale,
  "payment-methods": CreditCard,
  "financial-year-periods": CalendarDays,
  "financial-months": CalendarRange,
  users: User,
  "role-permissions": KeyRound,
};

export function getSectionIcon(sectionId: string): LucideIcon {
  return SECTION_ICONS[sectionId] ?? Settings;
}

export function getRouteIcon(routeId: string): LucideIcon {
  return ROUTE_ICONS[routeId] ?? FileText;
}
