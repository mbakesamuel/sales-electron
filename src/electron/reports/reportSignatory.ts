import { randomUUID } from "node:crypto";
import type { ReportSignatoryRow } from "../../shared/reports.types.js";
import { assertRouteWrite } from "../auth/permissions/service.js";
import { getDatabase } from "../db/index.js";

const ROUTE_ID = "report-settings";

function assertWrite(userId: string): { ok: true } | { ok: false; error: string } {
  const role = getDatabase()
    .prepare(`SELECT role FROM User WHERE id = ?`)
    .get(userId) as { role: string } | undefined;
  if (!role) {
    return { ok: false, error: "User not found." };
  }
  try {
    assertRouteWrite(role.role, ROUTE_ID);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Permission denied.",
    };
  }
  return { ok: true };
}

function normalizeDate(value: unknown): string | null {
  const raw = String(value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function listReportSignatories(): ReportSignatoryRow[] {
  return getDatabase()
    .prepare(
      `SELECT id, name, title, effectiveFrom, createdAt
       FROM ReportSignatory
       ORDER BY effectiveFrom DESC`,
    )
    .all()
    .map((row) => {
      const r = row as ReportSignatoryRow;
      return {
        id: String(r.id),
        name: String(r.name),
        title: String(r.title),
        effectiveFrom: String(r.effectiveFrom).slice(0, 10),
        createdAt: String(r.createdAt),
      };
    });
}

export type UpsertReportSignatoryInput = {
  userId: string;
  id?: string | null;
  name: string;
  title: string;
  effectiveFrom: string;
};

export type UpsertReportSignatoryResult =
  | { ok: true; row: ReportSignatoryRow }
  | { ok: false; error: string };

export function upsertReportSignatory(
  input: UpsertReportSignatoryInput,
): UpsertReportSignatoryResult {
  const write = assertWrite(input.userId);
  if (!write.ok) {
    return write;
  }

  const name = input.name.trim();
  const title = input.title.trim();
  const effectiveFrom = normalizeDate(input.effectiveFrom);
  if (!name) {
    return { ok: false, error: "Signatory name is required." };
  }
  if (!title) {
    return { ok: false, error: "Signatory title is required." };
  }
  if (!effectiveFrom) {
    return { ok: false, error: "Effective-from date must be YYYY-MM-DD." };
  }

  const db = getDatabase();
  const existingId = input.id?.trim() || null;

  try {
    if (existingId) {
      const existing = db
        .prepare(`SELECT id FROM ReportSignatory WHERE id = ?`)
        .get(existingId) as { id: string } | undefined;
      if (!existing) {
        return { ok: false, error: "Signatory entry not found." };
      }
      db.prepare(
        `UPDATE ReportSignatory
         SET name = ?, title = ?, effectiveFrom = ?
         WHERE id = ?`,
      ).run(name, title, effectiveFrom, existingId);
    } else {
      const id = randomUUID();
      db.prepare(
        `INSERT INTO ReportSignatory (id, name, title, effectiveFrom)
         VALUES (?, ?, ?, ?)`,
      ).run(id, name, title, effectiveFrom);
      const row = db
        .prepare(
          `SELECT id, name, title, effectiveFrom, createdAt
           FROM ReportSignatory WHERE id = ?`,
        )
        .get(id) as ReportSignatoryRow;
      return {
        ok: true,
        row: {
          id: String(row.id),
          name: String(row.name),
          title: String(row.title),
          effectiveFrom: String(row.effectiveFrom).slice(0, 10),
          createdAt: String(row.createdAt),
        },
      };
    }

    const row = db
      .prepare(
        `SELECT id, name, title, effectiveFrom, createdAt
         FROM ReportSignatory WHERE id = ?`,
      )
      .get(existingId) as ReportSignatoryRow;
    return {
      ok: true,
      row: {
        id: String(row.id),
        name: String(row.name),
        title: String(row.title),
        effectiveFrom: String(row.effectiveFrom).slice(0, 10),
        createdAt: String(row.createdAt),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("unique")) {
      return {
        ok: false,
        error: "A signatory already exists for that effective-from date.",
      };
    }
    return { ok: false, error: message || "Failed to save signatory." };
  }
}

export type DeleteReportSignatoryResult =
  | { ok: true }
  | { ok: false; error: string };

export function deleteReportSignatory(
  userId: string,
  id: string,
): DeleteReportSignatoryResult {
  const write = assertWrite(userId);
  if (!write.ok) {
    return write;
  }
  const signatoryId = id.trim();
  if (!signatoryId) {
    return { ok: false, error: "Signatory id is required." };
  }

  const count = (
    getDatabase().prepare(`SELECT COUNT(*) AS c FROM ReportSignatory`).get() as {
      c: number;
    }
  ).c;
  if (count <= 1) {
    return { ok: false, error: "Keep at least one signatory entry." };
  }

  const result = getDatabase()
    .prepare(`DELETE FROM ReportSignatory WHERE id = ?`)
    .run(signatoryId);
  if (result.changes === 0) {
    return { ok: false, error: "Signatory entry not found." };
  }
  return { ok: true };
}
