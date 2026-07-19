import type {
  FinancialMonthRow,
  FinancialPeriodStatus,
  FinancialYearRow,
  OpenPostingPeriod,
  OpenYearResult,
} from "../../shared/financialYears.types.js";
import { getDatabase } from "../db/index.js";
import { createTextPrimaryKey } from "../db/tableMeta.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local wall-clock timestamp for openedAt / closedAt (not UTC). */
function nowIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function localTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function monthStartDate(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

function monthEndDate(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${pad2(month)}-${pad2(lastDay)}`;
}

function yearStartDate(year: number): string {
  return `${year}-01-01`;
}

function yearEndDate(year: number): string {
  return `${year}-12-31`;
}

function mapYearRow(row: Record<string, unknown>): FinancialYearRow {
  return {
    id: String(row.id),
    financialYear: Number(row.financialYear),
    status: String(row.status).toUpperCase() === "OPEN" ? "OPEN" : "CLOSED",
    openedAt: row.openedAt != null ? String(row.openedAt) : null,
    closedAt: row.closedAt != null ? String(row.closedAt) : null,
    startDate: String(row.startDate).slice(0, 10),
    endDate: String(row.endDate).slice(0, 10),
    openMonthCount: Number(row.openMonthCount ?? 0),
    monthCount: Number(row.monthCount ?? 0),
  };
}

function mapMonthRow(row: Record<string, unknown>): FinancialMonthRow {
  return {
    id: String(row.id),
    financialYearPeriodId: String(row.financialYearPeriodId),
    financialYear: Number(row.financialYear),
    calendarMonth: Number(row.calendarMonth),
    name: String(row.name),
    status: String(row.status).toUpperCase() === "OPEN" ? "OPEN" : "CLOSED",
    openedAt: row.openedAt != null ? String(row.openedAt) : null,
    closedAt: row.closedAt != null ? String(row.closedAt) : null,
  };
}

function ensureTwelveMonths(periodId: string, financialYear: number): void {
  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT calendarMonth FROM FinancialMonth WHERE financialYearPeriodId = ?`,
    )
    .all(periodId) as Array<{ calendarMonth: number }>;
  const have = new Set(existing.map((row) => row.calendarMonth));
  const insert = db.prepare(
    `INSERT INTO FinancialMonth (
      id, financialYearPeriodId, financialYear, calendarMonth, name, status, openedAt, closedAt
    ) VALUES (?, ?, ?, ?, ?, 'CLOSED', NULL, NULL)`,
  );

  for (let month = 1; month <= 12; month += 1) {
    if (have.has(month)) continue;
    insert.run(
      createTextPrimaryKey(),
      periodId,
      financialYear,
      month,
      MONTH_NAMES[month - 1],
    );
  }
}

function closeAllOpenYearsAndMonths(): void {
  const db = getDatabase();
  const timestamp = nowIso();
  db.prepare(
    `UPDATE FinancialYearPeriod
     SET status = 'CLOSED', closedAt = ?
     WHERE status = 'OPEN'`,
  ).run(timestamp);
  db.prepare(
    `UPDATE FinancialMonth
     SET status = 'CLOSED', closedAt = ?
     WHERE status = 'OPEN'`,
  ).run(timestamp);
}

function openMonthRow(monthId: string): void {
  const db = getDatabase();
  const timestamp = nowIso();
  const month = db
    .prepare(`SELECT financialYearPeriodId FROM FinancialMonth WHERE id = ?`)
    .get(monthId) as { financialYearPeriodId: string } | undefined;
  if (!month) {
    throw new Error("Financial month not found.");
  }

  db.prepare(
    `UPDATE FinancialMonth
     SET status = 'CLOSED', closedAt = ?
     WHERE financialYearPeriodId = ? AND status = 'OPEN' AND id != ?`,
  ).run(timestamp, month.financialYearPeriodId, monthId);

  db.prepare(
    `UPDATE FinancialMonth
     SET status = 'OPEN', openedAt = COALESCE(openedAt, ?), closedAt = NULL
     WHERE id = ?`,
  ).run(timestamp, monthId);
}

function pickInitialMonth(financialYear: number): number {
  const today = new Date();
  if (today.getFullYear() === financialYear) {
    return today.getMonth() + 1;
  }
  return 1;
}

function getYearById(id: string): FinancialYearRow | null {
  const row = getDatabase()
    .prepare(
      `SELECT y.*,
              (SELECT COUNT(*) FROM FinancialMonth m WHERE m.financialYearPeriodId = y.id) AS monthCount,
              (SELECT COUNT(*) FROM FinancialMonth m WHERE m.financialYearPeriodId = y.id AND m.status = 'OPEN') AS openMonthCount
       FROM FinancialYearPeriod y
       WHERE y.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapYearRow(row) : null;
}

export function listYears(): FinancialYearRow[] {
  const rows = getDatabase()
    .prepare(
      `SELECT y.*,
              (SELECT COUNT(*) FROM FinancialMonth m WHERE m.financialYearPeriodId = y.id) AS monthCount,
              (SELECT COUNT(*) FROM FinancialMonth m WHERE m.financialYearPeriodId = y.id AND m.status = 'OPEN') AS openMonthCount
       FROM FinancialYearPeriod y
       ORDER BY y.financialYear DESC`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapYearRow);
}

export function listMonthsForPeriod(periodId: string): FinancialMonthRow[] {
  const rows = getDatabase()
    .prepare(
      `SELECT * FROM FinancialMonth
       WHERE financialYearPeriodId = ?
       ORDER BY calendarMonth ASC`,
    )
    .all(periodId) as Array<Record<string, unknown>>;
  return rows.map(mapMonthRow);
}

export function listMonthsForOpenYear(): {
  year: FinancialYearRow | null;
  months: FinancialMonthRow[];
} {
  const openYear = getDatabase()
    .prepare(
      `SELECT y.*,
              (SELECT COUNT(*) FROM FinancialMonth m WHERE m.financialYearPeriodId = y.id) AS monthCount,
              (SELECT COUNT(*) FROM FinancialMonth m WHERE m.financialYearPeriodId = y.id AND m.status = 'OPEN') AS openMonthCount
       FROM FinancialYearPeriod y
       WHERE y.status = 'OPEN'
       ORDER BY y.financialYear DESC
       LIMIT 1`,
    )
    .get() as Record<string, unknown> | undefined;

  if (!openYear) {
    return { year: null, months: [] };
  }

  const year = mapYearRow(openYear);
  ensureTwelveMonths(year.id, year.financialYear);
  return { year, months: listMonthsForPeriod(year.id) };
}

export function getOpenPostingPeriod(): OpenPostingPeriod | null {
  const row = getDatabase()
    .prepare(
      `SELECT y.id AS financialYearPeriodId, y.financialYear,
              m.id AS monthId, m.calendarMonth, m.name AS monthName
       FROM FinancialYearPeriod y
       INNER JOIN FinancialMonth m ON m.financialYearPeriodId = y.id
       WHERE y.status = 'OPEN' AND m.status = 'OPEN'
       ORDER BY y.financialYear DESC, m.calendarMonth DESC
       LIMIT 1`,
    )
    .get() as
    | {
        financialYearPeriodId: string;
        financialYear: number;
        monthId: string;
        calendarMonth: number;
        monthName: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    financialYearPeriodId: row.financialYearPeriodId,
    financialYear: row.financialYear,
    monthId: row.monthId,
    calendarMonth: row.calendarMonth,
    monthName: row.monthName,
    startDate: monthStartDate(row.financialYear, row.calendarMonth),
    endDate: monthEndDate(row.financialYear, row.calendarMonth),
  };
}

export function assertDateInOpenMonth(isoDate: string): OpenPostingPeriod {
  const period = getOpenPostingPeriod();
  if (!period) {
    throw new Error("Open a financial month before posting.");
  }
  const date = isoDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid transaction date.");
  }
  if (date < period.startDate || date > period.endDate) {
    throw new Error(
      `Transaction date must fall in the open financial month (${period.monthName} ${period.financialYear}).`,
    );
  }
  return period;
}

export function assertBudgetYear(financialYear: unknown): void {
  const period = getOpenPostingPeriod();
  if (!period) {
    throw new Error("Open a financial month before editing budgets.");
  }
  const year = Number(financialYear);
  if (!Number.isFinite(year) || year !== period.financialYear) {
    throw new Error(
      `Budget financial year must match the open year (${period.financialYear}).`,
    );
  }
}

/** As-at date for reports: today clamped into the open financial year. */
export function resolveReportAsAt(): {
  asAtIso: string;
  period: OpenPostingPeriod;
} {
  const period = getOpenPostingPeriod();
  if (!period) {
    throw new Error("Open a financial month before running reports.");
  }
  const yearStart = yearStartDate(period.financialYear);
  const yearEnd = yearEndDate(period.financialYear);
  const today = localTodayIso();
  let asAtIso = today;
  if (asAtIso < yearStart) {
    asAtIso = yearStart;
  } else if (asAtIso > yearEnd) {
    asAtIso = yearEnd;
  }
  return { asAtIso, period };
}

export function openYear(financialYear: number): OpenYearResult {
  if (!Number.isInteger(financialYear) || financialYear < 2000 || financialYear > 2100) {
    throw new Error("Enter a valid financial year (2000–2100).");
  }

  const db = getDatabase();
  const timestamp = nowIso();

  const tx = db.transaction(() => {
    closeAllOpenYearsAndMonths();

    const existing = db
      .prepare(`SELECT id FROM FinancialYearPeriod WHERE financialYear = ?`)
      .get(financialYear) as { id: string } | undefined;

    let periodId: string;
    if (existing) {
      periodId = existing.id;
      db.prepare(
        `UPDATE FinancialYearPeriod
         SET status = 'OPEN', openedAt = ?, closedAt = NULL,
             startDate = ?, endDate = ?
         WHERE id = ?`,
      ).run(timestamp, yearStartDate(financialYear), yearEndDate(financialYear), periodId);
    } else {
      periodId = createTextPrimaryKey();
      db.prepare(
        `INSERT INTO FinancialYearPeriod (
          id, financialYear, status, openedAt, closedAt, startDate, endDate
        ) VALUES (?, ?, 'OPEN', ?, NULL, ?, ?)`,
      ).run(
        periodId,
        financialYear,
        timestamp,
        yearStartDate(financialYear),
        yearEndDate(financialYear),
      );
    }

    ensureTwelveMonths(periodId, financialYear);

    const initialMonth = pickInitialMonth(financialYear);
    const monthRow = db
      .prepare(
        `SELECT id FROM FinancialMonth
         WHERE financialYearPeriodId = ? AND calendarMonth = ?`,
      )
      .get(periodId, initialMonth) as { id: string } | undefined;
    if (!monthRow) {
      throw new Error("Failed to create financial months.");
    }
    openMonthRow(monthRow.id);

    return periodId;
  });

  const periodId = tx();
  const year = getYearById(periodId);
  if (!year) {
    throw new Error("Failed to open financial year.");
  }
  return { year, months: listMonthsForPeriod(periodId) };
}

export function closeYear(periodId: string): FinancialYearRow {
  const db = getDatabase();
  const timestamp = nowIso();
  const existing = db
    .prepare(`SELECT id, status FROM FinancialYearPeriod WHERE id = ?`)
    .get(periodId) as { id: string; status: string } | undefined;
  if (!existing) {
    throw new Error("Financial year not found.");
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE FinancialMonth
       SET status = 'CLOSED', closedAt = ?
       WHERE financialYearPeriodId = ? AND status = 'OPEN'`,
    ).run(timestamp, periodId);
    db.prepare(
      `UPDATE FinancialYearPeriod
       SET status = 'CLOSED', closedAt = ?
       WHERE id = ?`,
    ).run(timestamp, periodId);
  });
  tx();

  const year = getYearById(periodId);
  if (!year) {
    throw new Error("Financial year not found.");
  }
  return year;
}

export function setMonthStatus(
  monthId: string,
  status: FinancialPeriodStatus,
): FinancialMonthRow {
  const db = getDatabase();
  const month = db
    .prepare(`SELECT * FROM FinancialMonth WHERE id = ?`)
    .get(monthId) as Record<string, unknown> | undefined;
  if (!month) {
    throw new Error("Financial month not found.");
  }

  const year = db
    .prepare(`SELECT status FROM FinancialYearPeriod WHERE id = ?`)
    .get(String(month.financialYearPeriodId)) as { status: string } | undefined;
  if (!year || year.status !== "OPEN") {
    throw new Error("Open the financial year before changing month status.");
  }

  if (status === "OPEN") {
    openMonthRow(monthId);
  } else {
    const timestamp = nowIso();
    db.prepare(
      `UPDATE FinancialMonth
       SET status = 'CLOSED', closedAt = ?
       WHERE id = ?`,
    ).run(timestamp, monthId);
  }

  const updated = db
    .prepare(`SELECT * FROM FinancialMonth WHERE id = ?`)
    .get(monthId) as Record<string, unknown>;
  return mapMonthRow(updated);
}

/** Backfill months for open years after migration. */
export function backfillFinancialMonths(): void {
  const db = getDatabase();
  const years = db
    .prepare(`SELECT id, financialYear, status FROM FinancialYearPeriod`)
    .all() as Array<{ id: string; financialYear: number; status: string }>;

  for (const year of years) {
    ensureTwelveMonths(year.id, year.financialYear);
  }

  const openYears = years.filter((year) => year.status === "OPEN");
  for (const year of openYears) {
    const openMonth = db
      .prepare(
        `SELECT id FROM FinancialMonth
         WHERE financialYearPeriodId = ? AND status = 'OPEN'
         LIMIT 1`,
      )
      .get(year.id) as { id: string } | undefined;
    if (openMonth) continue;

    const initialMonth = pickInitialMonth(year.financialYear);
    const monthRow = db
      .prepare(
        `SELECT id FROM FinancialMonth
         WHERE financialYearPeriodId = ? AND calendarMonth = ?`,
      )
      .get(year.id, initialMonth) as { id: string } | undefined;
    if (monthRow) {
      openMonthRow(monthRow.id);
    }
  }
}
