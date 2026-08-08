export declare const MONTHLY_DELIVERY_H1_ROUTE = "monthly-delivery-report-h1";
export declare const MONTHLY_DELIVERY_H2_ROUTE = "monthly-delivery-report-h2";
export declare function monthlyDeliveryHalfForCalendarMonth(calendarMonth: number): 1 | 2;
export declare function visibleMonthlyDeliveryRouteId(calendarMonth: number | null | undefined): string | null;
export declare function isMonthlyDeliveryRouteVisible(routeId: string, calendarMonth: number | null | undefined): boolean;
export declare function filterSectionsForOpenMonth<TSection extends {
    routes: readonly {
        id: string;
    }[];
    groups?: readonly {
        id: string;
        label: string;
        routes: readonly {
            id: string;
        }[];
    }[];
}>(sections: readonly TSection[], calendarMonth: number | null | undefined): TSection[];
