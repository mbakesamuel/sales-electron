import { useEffect, useMemo, useState } from "preact/hooks";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import {
  canAccessRouteFromSnapshot,
  canWriteRouteFromSnapshot,
  filterSectionsForPermissions,
  getRouteAccessFromSnapshot,
} from "../../shared/permissionUtils.ts";
import {
  filterSectionsForOpenMonth,
  isMonthlyDeliveryRouteVisible,
} from "../../shared/monthlyDeliveryReportRoutes.ts";
import { formatRoleLabel } from "../../shared/roles.ts";
import type { AuthUser } from "../auth/session.ts";
import { TableDataView } from "../components/TableDataView.tsx";
import { CustomersScreen } from "../customers/CustomersScreen.tsx";
import { CustomerTypesScreen } from "../customers/CustomerTypesScreen.tsx";
import { ProductsScreen } from "../products/ProductsScreen.tsx";
import { CategoriesScreen } from "../products/CategoriesScreen.tsx";
import { ProductUnitPricesScreen } from "../products/ProductUnitPricesScreen.tsx";
import { LocationsScreen } from "../locations/LocationsScreen.tsx";
import { SalesPointsScreen } from "../sales-points/SalesPointsScreen.tsx";
import { CommercialServicesScreen } from "../commercial-services/CommercialServicesScreen.tsx";
import { CompanySettingsScreen } from "../company-settings/CompanySettingsScreen.tsx";
import { ReportSettingsScreen } from "../reports/ReportSettingsScreen.tsx";
import { StorageLocationsScreen } from "../storage-locations/StorageLocationsScreen.tsx";
import { TaxRegimesScreen } from "../tax/TaxRegimesScreen.tsx";
import { TaxRatesScreen } from "../tax/TaxRatesScreen.tsx";
import { PaymentMethodsScreen } from "../payment-methods/PaymentMethodsScreen.tsx";
import { FinancialYearsScreen } from "../financial-years/FinancialYearsScreen.tsx";
import { FinancialMonthsScreen } from "../financial-years/FinancialMonthsScreen.tsx";
import { SalesScreen } from "../sales/SalesScreen.tsx";
import { DeliveryOrdersScreen } from "../delivery-orders/DeliveryOrdersScreen.tsx";
import { CarryForwardCommitmentsScreen } from "../commitments/CarryForwardCommitmentsScreen.tsx";
import { CarryForwardStockScreen } from "../stock/CarryForwardStockScreen.tsx";
import { StockScreen } from "../stock/StockScreen.tsx";
import { BottleOilStockSalesReportScreen } from "../reports/BottleOilStockSalesReportScreen.tsx";
import { BottledWeeklyIssuesReportScreen } from "../reports/BottledWeeklyIssuesReportScreen.tsx";
import {
  MonthlyDeliveryReportH1Screen,
  MonthlyDeliveryReportH2Screen,
} from "../reports/MonthlyDeliveryReportScreen.tsx";
import { MonthlyStockReconciliationScreen } from "../reports/MonthlyStockReconciliationScreen.tsx";
import { WeeklyDeliveriesReportScreen } from "../reports/WeeklyDeliveriesReportScreen.tsx";
import { DailySalesReportScreen } from "../reports/DailySalesReportScreen.tsx";
import { CommitmentReportScreen } from "../reports/CommitmentReportScreen.tsx";
import { StockCommitmentReportScreen } from "../reports/StockCommitmentReport.tsx";
import { StockReportScreen } from "../reports/StockReportScreen.tsx";
import { WeeklyPrintPackScreen } from "../reports/WeeklyPrintPackScreen.tsx";
import { SalesBudgetMonthlyCrosstabScreen } from "../reports/SalesBudgetMonthlyCrosstabScreen.tsx";
import { SalesBudgetWeeklyCrosstabScreen } from "../reports/SalesBudgetWeeklyCrosstabScreen.tsx";
import { SalesBudgetScreen } from "../sales-budget/SalesBudgetScreen.tsx";
import { canAccessStockModule } from "../../shared/stockModule.ts";
import { PermissionsScreen } from "../permissions/PermissionsScreen.tsx";
import { UsersScreen } from "../users/UsersScreen.tsx";
import {
  DEFAULT_ROUTE_ID,
  findRouteById,
  OVERVIEW_ROUTE,
  SCHEMA_ROUTE_SECTIONS,
  type SchemaRoute,
} from "../navigation/schemaRoutes.ts";
import {
  LOGOUT_ICON,
  OVERVIEW_ICON,
  getRouteIcon,
  getSectionIcon,
} from "../navigation/sidebarIcons.ts";
import { SidebarChevron, SidebarIcon } from "../navigation/SidebarIcon.tsx";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { getAuthenticatedFinancialYears } from "../auth/financialYears.ts";
import type { OpenPostingPeriod } from "../../shared/financialYears.types.ts";
import { DashboardScreen } from "../dashboard/DashboardScreen.tsx";
import "./HomeScreen.css";

interface HomeScreenProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  onPermissionsSaved: (next: RolePermissionsSnapshot) => void;
  onLogout: () => void;
}

function RouteContent({
  route,
  user,
  permissions,
  onPermissionsSaved,
  onNavigate,
  openCalendarMonth,
}: {
  route: SchemaRoute;
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
  onPermissionsSaved: (next: RolePermissionsSnapshot) => void;
  onNavigate: (routeId: string) => void;
  openCalendarMonth: number | null;
}) {
  const routeAccess = getRouteAccessFromSnapshot(permissions, route.id);
  const readOnly = routeAccess === "read";

  if (
    route.id === "stock"
      ? !canAccessStockModule(permissions)
      : !canAccessRouteFromSnapshot(permissions, route.id)
  ) {
    return (
      <p class="home-access-denied">
        You do not have permission to open this module.
      </p>
    );
  }

  if (route.id === "role-permissions") {
    return (
      <PermissionsScreen
        permissions={permissions}
        onPermissionsSaved={onPermissionsSaved}
      />
    );
  }

  if (route.id === "users") {
    return <UsersScreen readOnly={readOnly} />;
  }

  if (route.id === "sales") {
    return <SalesScreen user={user} permissions={permissions} readOnly={readOnly} />;
  }

  if (route.id === "delivery-orders") {
    return (
      <DeliveryOrdersScreen user={user} permissions={permissions} readOnly={readOnly} />
    );
  }

  if (route.id === "carry-forward-commitments") {
    return (
      <CarryForwardCommitmentsScreen
        user={user}
        permissions={permissions}
        readOnly={readOnly}
      />
    );
  }

  if (route.id === "carry-forward-stock") {
    return (
      <CarryForwardStockScreen
        user={user}
        permissions={permissions}
        readOnly={readOnly}
      />
    );
  }

  if (route.id === "stock") {
    return <StockScreen user={user} permissions={permissions} />;
  }

  if (route.id === "stock-commitment-report") {
    return <StockCommitmentReportScreen />;
  }

  if (route.id === "stock-report") {
    return <StockReportScreen />;
  }

  if (route.id === "commitment-report") {
    return <CommitmentReportScreen />;
  }

  if (route.id === "bottle-oil-stock-sales-report") {
    return <BottleOilStockSalesReportScreen />;
  }

  if (route.id === "bottled-weekly-issues-report") {
    return <BottledWeeklyIssuesReportScreen />;
  }

  if (route.id === "sales-delivery-report") {
    return <WeeklyDeliveriesReportScreen />;
  }

  if (route.id === "daily-sales-report") {
    return <DailySalesReportScreen />;
  }

  if (route.id === "weekly-print-pack") {
    return <WeeklyPrintPackScreen permissions={permissions} />;
  }

  if (route.id === "monthly-delivery-report-h1") {
    if (!isMonthlyDeliveryRouteVisible(route.id, openCalendarMonth)) {
      return (
        <p class="scr-status">
          Monthly delivery (Jan–Jun) is not available for the current open month.
        </p>
      );
    }
    return <MonthlyDeliveryReportH1Screen />;
  }

  if (route.id === "monthly-delivery-report-h2") {
    if (!isMonthlyDeliveryRouteVisible(route.id, openCalendarMonth)) {
      return (
        <p class="scr-status">
          Monthly delivery (Jul–Dec) is not available for the current open month.
        </p>
      );
    }
    return <MonthlyDeliveryReportH2Screen />;
  }

  if (route.id === "monthly-stock-reconciliation-report") {
    return <MonthlyStockReconciliationScreen />;
  }

  if (route.id === "sales-budget-monthly-crosstab") {
    return <SalesBudgetMonthlyCrosstabScreen onNavigate={onNavigate} />;
  }

  if (route.id === "sales-budget-weekly-crosstab") {
    return <SalesBudgetWeeklyCrosstabScreen onNavigate={onNavigate} />;
  }

  if (route.id === "sales-budget") {
    return <SalesBudgetScreen readOnly={readOnly} />;
  }

  if (route.id === "customers") {
    return <CustomersScreen readOnly={readOnly} />;
  }

  if (route.id === "customer-types") {
    return <CustomerTypesScreen readOnly={readOnly} />;
  }

  if (route.id === "products") {
    return <ProductsScreen readOnly={readOnly} />;
  }

  if (route.id === "product-categories") {
    return <CategoriesScreen readOnly={readOnly} />;
  }

  if (route.id === "unit-prices") {
    return <ProductUnitPricesScreen readOnly={readOnly} />;
  }

  if (route.id === "sales-points") {
    return <SalesPointsScreen readOnly={readOnly} />;
  }

  if (route.id === "commercial-services") {
    return <CommercialServicesScreen readOnly={readOnly} />;
  }

  if (route.id === "company-settings") {
    return <CompanySettingsScreen readOnly={readOnly} />;
  }

  if (route.id === "report-settings") {
    return <ReportSettingsScreen readOnly={readOnly} />;
  }

  if (route.id === "locations") {
    return <LocationsScreen readOnly={readOnly} />;
  }

  if (route.id === "storage-locations") {
    return <StorageLocationsScreen readOnly={readOnly} />;
  }

  if (route.id === "tax-regimes") {
    return <TaxRegimesScreen readOnly={readOnly} />;
  }

  if (route.id === "tax-rate-schedules") {
    return <TaxRatesScreen readOnly={readOnly} />;
  }

  if (route.id === "payment-methods") {
    return <PaymentMethodsScreen readOnly={readOnly} />;
  }

  if (route.id === "financial-year-periods") {
    return <FinancialYearsScreen readOnly={readOnly} />;
  }

  if (route.id === "financial-months") {
    return <FinancialMonthsScreen readOnly={readOnly} />;
  }

  return (
    <TableDataView
      key={route.table}
      table={route.table}
      description={route.description}
      readOnly={readOnly || !canWriteRouteFromSnapshot(permissions, route.id)}
    />
  );
}

export function HomeScreen({
  user,
  permissions,
  onPermissionsSaved,
  onLogout,
}: HomeScreenProps) {
  const [activeRouteId, setActiveRouteId] = useState(DEFAULT_ROUTE_ID);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sales: true,
  });
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [openPostingPeriod, setOpenPostingPeriod] =
    useState<OpenPostingPeriod | null>(null);

  const visibleSections = useMemo(() => {
    const permitted = filterSectionsForPermissions(SCHEMA_ROUTE_SECTIONS, permissions);
    return filterSectionsForOpenMonth(
      permitted,
      openPostingPeriod?.calendarMonth ?? null,
    );
  }, [permissions, openPostingPeriod]);

  const activeRoute = findRouteById(activeRouteId) ?? OVERVIEW_ROUTE;

  useEffect(() => {
    let cancelled = false;

    async function refreshOpenPostingPeriod() {
      try {
        const period =
          await getAuthenticatedFinancialYears().getOpenPostingPeriod();
        if (!cancelled) setOpenPostingPeriod(period);
      } catch {
        if (!cancelled) setOpenPostingPeriod(null);
      }
    }

    void refreshOpenPostingPeriod();
    const refreshOnFocus = () => void refreshOpenPostingPeriod();
    window.addEventListener("focus", refreshOnFocus);
    const intervalId = window.setInterval(refreshOpenPostingPeriod, 15_000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshOnFocus);
      window.clearInterval(intervalId);
    };
  }, [activeRouteId]);

  useEffect(() => {
    if (activeRouteId === DEFAULT_ROUTE_ID) {
      return;
    }

    const canAccess =
      activeRouteId === "stock"
        ? canAccessStockModule(permissions)
        : canAccessRouteFromSnapshot(permissions, activeRouteId);

    if (!canAccess) {
      setActiveRouteId(DEFAULT_ROUTE_ID);
      return;
    }

    if (!isMonthlyDeliveryRouteVisible(activeRouteId, openPostingPeriod?.calendarMonth ?? null)) {
      setActiveRouteId(DEFAULT_ROUTE_ID);
    }
  }, [activeRouteId, permissions, openPostingPeriod]);

  function toggleSection(sectionId: string) {
    setOpenSections((current) => {
      const isCurrentlyOpen = Boolean(current[sectionId]);
      if (isCurrentlyOpen) {
        return { [sectionId]: false };
      }

      return { [sectionId]: true };
    });
  }

  function selectRoute(routeId: string, sectionId?: string) {
    setActiveRouteId(routeId);
    if (sectionId) {
      setOpenSections({ [sectionId]: true });
    }
  }

  const customScreenRoutes = new Set([
    "stock",
    "stock-commitment-report",
    "stock-report",
    "commitment-report",
    "bottle-oil-stock-sales-report",
    "bottled-weekly-issues-report",
    "sales-delivery-report",
    "daily-sales-report",
    "weekly-print-pack",
    "monthly-delivery-report-h1",
    "monthly-delivery-report-h2",
    "monthly-stock-reconciliation-report",
    "sales-budget-monthly-crosstab",
    "sales-budget-weekly-crosstab",
    "sales-budget",
    "customers",
    "customer-types",
    "products",
    "product-categories",
    "unit-prices",
    "sales-points",
    "commercial-services",
    "company-settings",
    "report-settings",
    "locations",
    "storage-locations",
    "tax-regimes",
    "tax-rate-schedules",
    "payment-methods",
    "financial-year-periods",
    "financial-months",
    "role-permissions",
    "carry-forward-commitments",
    "carry-forward-stock",
  ]);

  return (
    <div class="home-layout">
      <aside class="home-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div class="sidebar-user">
            <span class="sidebar-username">{user.name}</span>
            <span class="sidebar-role">{formatRoleLabel(user.role)}</span>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Application modules">
          <button
            type="button"
            class={`sidebar-route${activeRouteId === DEFAULT_ROUTE_ID ? " is-active" : ""}`}
            onClick={() => selectRoute(DEFAULT_ROUTE_ID)}
          >
            <SidebarIcon icon={OVERVIEW_ICON} className="sidebar-route-icon" />
            <span class="sidebar-route-label">Overview</span>
          </button>

          <div class="sidebar-accordion">
            {visibleSections.map((section) => {
              const isOpen = Boolean(openSections[section.id]);

              return (
                <section key={section.id} class="accordion-section">
                  <button
                    type="button"
                    class="accordion-trigger"
                    aria-expanded={isOpen}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span class="accordion-trigger-label">
                      <SidebarIcon
                        icon={getSectionIcon(section.id)}
                        className="sidebar-route-icon"
                      />
                      <span>{section.label}</span>
                    </span>
                    <SidebarChevron isOpen={isOpen} />
                  </button>

                  {isOpen ? (
                    <div class="accordion-panel">
                      {section.groups?.length
                        ? section.groups.map((group) => (
                            <div key={group.id} class="sidebar-route-group">
                              <div class="sidebar-route-group-label">{group.label}</div>
                              {group.routes.map((route) => (
                                <button
                                  key={route.id}
                                  type="button"
                                  class={`sidebar-route sidebar-route-nested${
                                    activeRouteId === route.id ? " is-active" : ""
                                  }`}
                                  onClick={() => selectRoute(route.id, section.id)}
                                >
                                  <SidebarIcon
                                    icon={getRouteIcon(route.id)}
                                    className="sidebar-route-icon"
                                  />
                                  <span class="sidebar-route-label">{route.label}</span>
                                </button>
                              ))}
                            </div>
                          ))
                        : section.routes.map((route) => (
                            <button
                              key={route.id}
                              type="button"
                              class={`sidebar-route sidebar-route-nested${
                                activeRouteId === route.id ? " is-active" : ""
                              }`}
                              onClick={() => selectRoute(route.id, section.id)}
                            >
                              <SidebarIcon
                                icon={getRouteIcon(route.id)}
                                className="sidebar-route-icon"
                              />
                              <span class="sidebar-route-label">{route.label}</span>
                            </button>
                          ))}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </nav>

        <button
          type="button"
          class="sidebar-logout"
          onClick={() => setLogoutConfirmOpen(true)}
        >
          <SidebarIcon icon={LOGOUT_ICON} className="sidebar-route-icon" />
          <span class="sidebar-route-label">Log out</span>
        </button>
      </aside>

      {logoutConfirmOpen ? (
        <ConfirmDialog
          ariaLabel="Confirm logout"
          title="Log out?"
          description={`Are you sure you want to sign out as ${user.name}? You will need to sign in again to continue.`}
          confirmLabel="Log out"
          cancelLabel="Stay signed in"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => {
            setLogoutConfirmOpen(false);
            onLogout();
          }}
        />
      ) : null}

      <main
        class={`home-main${activeRouteId === DEFAULT_ROUTE_ID ? " home-main--dashboard" : ""}`}
      >
        <header class="home-topbar no-print">
          <div class="home-topbar-period">
            <span>
              Open financial year:{" "}
              <strong>{openPostingPeriod?.financialYear ?? "None"}</strong>
            </span>
            <span class="home-topbar-divider" aria-hidden="true" />
            <span>
              Open month:{" "}
              <strong>{openPostingPeriod?.monthName ?? "None"}</strong>
            </span>
          </div>
        </header>

        {activeRouteId !== DEFAULT_ROUTE_ID && !customScreenRoutes.has(activeRouteId) ? (
          <header class="home-header">
            <div>
              <h1>{activeRoute.label}</h1>
              {activeRoute.table ? (
                <p class="home-header-meta">Schema table: {activeRoute.table}</p>
              ) : null}
            </div>
          </header>
        ) : null}

        {activeRouteId === DEFAULT_ROUTE_ID ? (
          <section class="home-content">
            <DashboardScreen />
          </section>
        ) : (
          <section class="home-content">
            <RouteContent
              route={activeRoute}
              user={user}
              permissions={permissions}
              onPermissionsSaved={onPermissionsSaved}
              onNavigate={(routeId) => selectRoute(routeId, "products")}
              openCalendarMonth={openPostingPeriod?.calendarMonth ?? null}
            />
          </section>
        )}

        <footer class="home-bottombar no-print">
          <span>ISD 2026</span>
        </footer>
      </main>
    </div>
  );
}
