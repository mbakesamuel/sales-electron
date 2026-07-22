export const MONTHLY_DELIVERY_H1_ROUTE = "monthly-delivery-report-h1";
export const MONTHLY_DELIVERY_H2_ROUTE = "monthly-delivery-report-h2";

const MONTHLY_DELIVERY_ROUTES = new Set([
  MONTHLY_DELIVERY_H1_ROUTE,
  MONTHLY_DELIVERY_H2_ROUTE,
]);

export function monthlyDeliveryHalfForCalendarMonth(calendarMonth: number): 1 | 2 {
  return calendarMonth <= 6 ? 1 : 2;
}

export function visibleMonthlyDeliveryRouteId(
  calendarMonth: number | null | undefined,
): string | null {
  if (calendarMonth == null || !Number.isFinite(calendarMonth)) {
    return null;
  }
  const half = monthlyDeliveryHalfForCalendarMonth(calendarMonth);
  return half === 1 ? MONTHLY_DELIVERY_H1_ROUTE : MONTHLY_DELIVERY_H2_ROUTE;
}

export function isMonthlyDeliveryRouteVisible(
  routeId: string,
  calendarMonth: number | null | undefined,
): boolean {
  if (!MONTHLY_DELIVERY_ROUTES.has(routeId)) {
    return true;
  }
  return visibleMonthlyDeliveryRouteId(calendarMonth) === routeId;
}

export function filterSectionsForOpenMonth<
  TSection extends {
    routes: readonly { id: string }[];
    groups?: readonly { id: string; label: string; routes: readonly { id: string }[] }[];
  },
>(sections: readonly TSection[], calendarMonth: number | null | undefined): TSection[] {
  function keepRoute(routeId: string): boolean {
    return isMonthlyDeliveryRouteVisible(routeId, calendarMonth);
  }

  return sections
    .map((section) => {
      if (section.groups?.length) {
        const groups = section.groups
          .map((group) => ({
            ...group,
            routes: group.routes.filter((route) => keepRoute(route.id)),
          }))
          .filter((group) => group.routes.length > 0);
        return {
          ...section,
          groups,
          routes: groups.flatMap((group) => [...group.routes]),
        };
      }

      return {
        ...section,
        routes: section.routes.filter((route) => keepRoute(route.id)),
      };
    })
    .filter((section) => section.routes.length > 0);
}
