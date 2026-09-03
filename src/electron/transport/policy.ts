import { getDatabase } from "../db/index.js";

export const MOLIWE_SALES_POINT_NAME = "Moliwe";

type AppDatabase = ReturnType<typeof getDatabase>;

export function loadTransportCostMoliweOnlyPolicy(
  db: AppDatabase = getDatabase(),
): boolean {
  try {
    const columns = db
      .prepare(`PRAGMA table_info(CompanySettings)`)
      .all() as Array<{ name: string }>;
    if (!columns.some((col) => col.name === "transportCostMoliweOnlyPolicy")) {
      return false;
    }

    const row = db
      .prepare(
        `SELECT transportCostMoliweOnlyPolicy
         FROM CompanySettings
         WHERE id = 'default'`,
      )
      .get() as { transportCostMoliweOnlyPolicy: number | null } | undefined;

    return Number(row?.transportCostMoliweOnlyPolicy ?? 0) !== 0;
  } catch {
    return false;
  }
}

export function resolveMoliweSalesPointId(
  db: AppDatabase = getDatabase(),
): number | null {
  const row = db
    .prepare(
      `SELECT id FROM SalesPoint
       WHERE isActive = 1 AND TRIM(name) = ? COLLATE NOCASE
       ORDER BY id ASC
       LIMIT 1`,
    )
    .get(MOLIWE_SALES_POINT_NAME) as { id: number } | undefined;

  return row?.id ?? null;
}

export function buildTransportCostPolicyNotice(
  policyEnabled: boolean,
  moliweSalesPointId: number | null,
): string | null {
  if (!policyEnabled) {
    return null;
  }
  if (moliweSalesPointId == null) {
    return `Moliwe-only transport cost policy is enabled, but no active collection point named "${MOLIWE_SALES_POINT_NAME}" was found. Add or activate that collection point in Company Settings.`;
  }
  return `Company policy: transportation cost is limited to the ${MOLIWE_SALES_POINT_NAME} collection point.`;
}

export function assertTransportCostSalesPointAllowed(
  salesPointId: number,
  policyEnabled: boolean,
  moliweSalesPointId: number | null,
): void {
  if (!policyEnabled) {
    return;
  }
  if (moliweSalesPointId == null) {
    throw new Error(
      `Moliwe-only transport cost policy is enabled, but no active collection point named "${MOLIWE_SALES_POINT_NAME}" was found.`,
    );
  }
  if (salesPointId !== moliweSalesPointId) {
    throw new Error(
      `Transportation cost is limited to the ${MOLIWE_SALES_POINT_NAME} collection point while the Moliwe-only policy is enabled.`,
    );
  }
}

export function filterLiftedLinesForTransportCostPolicy<
  T extends { salesPointId: number },
>(lines: T[], policyEnabled: boolean, moliweSalesPointId: number | null): T[] {
  if (!policyEnabled) {
    return lines;
  }
  if (moliweSalesPointId == null) {
    return [];
  }
  return lines.filter((line) => line.salesPointId === moliweSalesPointId);
}

export function assertTransportCostReportPolicyConfigured(
  policyEnabled: boolean,
  moliweSalesPointId: number | null,
): void {
  if (policyEnabled && moliweSalesPointId == null) {
    throw new Error(
      `Moliwe-only transport cost policy is enabled, but no active collection point named "${MOLIWE_SALES_POINT_NAME}" was found.`,
    );
  }
}
