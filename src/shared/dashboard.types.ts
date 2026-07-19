export interface DashboardDayRevenue {
  dateIso: string;
  amount: number;
}

export interface DashboardCategoryRevenue {
  categoryId: number | null;
  label: string;
  amount: number;
}

export interface DashboardDoVsSalesMonth {
  month: number;
  label: string;
  doQtyKg: number;
  salesQtyKg: number;
}

export interface DashboardOpenMonth {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  label: string;
}

export interface DashboardSummary {
  hasOpenPeriod: boolean;
  openMonth: DashboardOpenMonth | null;
  openYear: number | null;
  asAtIso: string;
  revenueByDay: DashboardDayRevenue[];
  revenueByCategory: DashboardCategoryRevenue[];
  doVsSalesByMonth: DashboardDoVsSalesMonth[];
}

export interface DashboardApi {
  getSummary(authToken: string): Promise<DashboardSummary>;
}
