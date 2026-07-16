import type { ReportCompanySettings } from "../../shared/reports.types.js";
import { getDatabase } from "../db/index.js";

export function loadReportCompanySettings(
  userId?: string | null,
): ReportCompanySettings {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT companyName, department, logoUrl
       FROM CompanySettings
       WHERE id = 'default'`,
    )
    .get() as
    | { companyName: string; department: string | null; logoUrl: string | null }
    | undefined;

  let serviceName: string | null = null;
  if (userId) {
    const service = db
      .prepare(
        `SELECT cs.name AS serviceName
         FROM User u
         LEFT JOIN CommercialService cs ON cs.id = u.commercialServiceId
         WHERE u.id = ?`,
      )
      .get(userId) as { serviceName: string | null } | undefined;
    serviceName = service?.serviceName?.trim() || null;
  }

  return {
    companyName: row?.companyName?.trim() || "MPOS",
    department: row?.department?.trim() || null,
    serviceName,
    logoUrl: row?.logoUrl?.trim() || null,
  };
}
