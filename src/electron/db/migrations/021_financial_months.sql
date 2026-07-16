-- Financial months for each financial year period.
CREATE TABLE IF NOT EXISTS FinancialMonth (
  id TEXT PRIMARY KEY NOT NULL,
  financialYearPeriodId TEXT NOT NULL REFERENCES FinancialYearPeriod(id) ON DELETE CASCADE,
  financialYear INTEGER NOT NULL,
  calendarMonth INTEGER NOT NULL CHECK (calendarMonth BETWEEN 1 AND 12),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED')),
  openedAt TEXT,
  closedAt TEXT,
  UNIQUE (financialYearPeriodId, calendarMonth)
);
CREATE INDEX IF NOT EXISTS FinancialMonth_period_status_idx
  ON FinancialMonth (financialYearPeriodId, status);
CREATE INDEX IF NOT EXISTS FinancialMonth_year_month_idx
  ON FinancialMonth (financialYear, calendarMonth);
