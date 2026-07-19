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

export interface ReportDisplaySettings {
  /** When true, omit report rows whose quantities are zero or empty. */
  hideZeroReportRows: boolean;
}

export function loadReportDisplaySettings(): ReportDisplaySettings {
  try {
    const row = getDatabase()
      .prepare(
        `SELECT hideZeroReportRows
         FROM CompanySettings
         WHERE id = 'default'`,
      )
      .get() as { hideZeroReportRows: number | null } | undefined;

    if (row == null || row.hideZeroReportRows == null) {
      return { hideZeroReportRows: true };
    }
    return { hideZeroReportRows: Number(row.hideZeroReportRows) !== 0 };
  } catch {
    return { hideZeroReportRows: true };
  }
}

function readReportCommentsMap(): Record<string, string> {
  try {
    const row = getDatabase()
      .prepare(
        `SELECT reportCommentsJson, stockCommitmentReportComments
         FROM CompanySettings
         WHERE id = 'default'`,
      )
      .get() as
      | {
          reportCommentsJson: string | null;
          stockCommitmentReportComments: string | null;
        }
      | undefined;

    let map: Record<string, string> = {};
    try {
      const parsed = JSON.parse(row?.reportCommentsJson || "{}") as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        map = { ...(parsed as Record<string, string>) };
      }
    } catch {
      map = {};
    }

    // Legacy fallback for stock-commitment only.
    const legacy = row?.stockCommitmentReportComments?.trim() ?? "";
    if (legacy && !(map["stock-commitment-report"]?.trim())) {
      map["stock-commitment-report"] = legacy;
    }
    return map;
  } catch {
    return {};
  }
}

/** Trimmed comments for a report route id; null when empty. */
export function loadReportComments(reportId: string): string | null {
  const trimmed = readReportCommentsMap()[reportId]?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/** @deprecated Prefer loadReportComments("stock-commitment-report"). */
export function loadStockCommitmentReportComments(): string | null {
  return loadReportComments("stock-commitment-report");
}

export type SaveReportCommentsResult =
  | { ok: true; comments: string | null }
  | { ok: false; error: string };

/** Atomically merge one report's comments into CompanySettings.reportCommentsJson. */
export function saveReportComments(
  reportId: string,
  text: string | null | undefined,
): SaveReportCommentsResult {
  const id = reportId.trim();
  if (!id) {
    return { ok: false, error: "Report id is required." };
  }

  try {
    const db = getDatabase();
    const map = readReportCommentsMap();
    const trimmed = (text ?? "").trim();
    if (trimmed) {
      map[id] = trimmed;
    } else {
      delete map[id];
    }

    db.prepare(
      `UPDATE CompanySettings
       SET reportCommentsJson = ?, updatedAt = datetime('now')
       WHERE id = 'default'`,
    ).run(JSON.stringify(map));

    return { ok: true, comments: trimmed.length > 0 ? trimmed : null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save comments.",
    };
  }
}
