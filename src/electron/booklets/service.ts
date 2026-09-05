import crypto from "node:crypto";
import { getDatabase } from "../db/index.js";
import {
  doRangesOverlap,
  isSerialInRange,
  validateBookletRange,
  validateBookletSerial,
} from "../../shared/bookletSerial.js";
import { canPerformAction } from "../auth/permissions/service.js";
import type {
  CreateDocumentBookletInput,
  DocumentBookletFilters,
  DocumentBookletKind,
  DocumentBookletRow,
  DocumentBookletStatus,
  RejectDocumentBookletResult,
  ValidateDocumentBookletResult,
  ValidateManyBookletsResult,
  ValidateSerialForSalesPointInput,
  ValidateSerialForSalesPointResult,
} from "../../shared/documentBooklets.types.js";

export function listDocumentBooklets(
  filters?: DocumentBookletFilters,
): DocumentBookletRow[] {
  const db = getDatabase();
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters?.documentKind && filters.documentKind !== "ALL") {
    conditions.push("b.documentKind = ?");
    params.push(filters.documentKind);
  }

  if (
    filters?.salesPointId !== undefined &&
    filters.salesPointId !== "ALL"
  ) {
    conditions.push("b.salesPointId = ?");
    params.push(filters.salesPointId);
  }

  if (filters?.status && filters.status !== "ALL") {
    conditions.push("b.status = ?");
    params.push(filters.status);
  }

  const sql = `
    SELECT
      b.id,
      b.documentKind,
      b.bookletCode,
      b.startSerial,
      b.endSerial,
      b.salesPointId,
      sp.name AS salesPointName,
      b.status,
      b.issuedAt,
      b.issuedByUserId,
      u.name AS issuedByUserName,
      b.validatedAt,
      b.validatedByUserId,
      vu.name AS validatedByUserName,
      b.notes,
      b.createdAt,
      b.updatedAt
    FROM DocumentBooklet b
    LEFT JOIN SalesPoint sp ON sp.id = b.salesPointId
    LEFT JOIN User u ON u.id = b.issuedByUserId
    LEFT JOIN User vu ON vu.id = b.validatedByUserId
    WHERE ${conditions.join(" AND ")}
    ORDER BY b.issuedAt DESC, b.createdAt DESC
  `;

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string;
    documentKind: DocumentBookletKind;
    bookletCode: string | null;
    startSerial: string;
    endSerial: string;
    salesPointId: number;
    salesPointName: string | null;
    status: DocumentBookletStatus;
    issuedAt: string;
    issuedByUserId: string | null;
    issuedByUserName: string | null;
    validatedAt: string | null;
    validatedByUserId: string | null;
    validatedByUserName: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;

  return rows.map((r) => {
    let totalPages = 0;
    try {
      totalPages = Number(BigInt(r.endSerial) - BigInt(r.startSerial) + 1n);
    } catch {
      totalPages = 0;
    }

    let usedPages = 0;
    try {
      if (r.documentKind === "SALES_INVOICE") {
        const countRow = db
          .prepare(
            `SELECT COUNT(*) AS c
             FROM Sale
             WHERE salesPointId = ?
               AND invoiceNo NOT GLOB '*[^0-9]*'
               AND length(invoiceNo) > 0
               AND CAST(invoiceNo AS INTEGER) >= CAST(? AS INTEGER)
               AND CAST(invoiceNo AS INTEGER) <= CAST(? AS INTEGER)`,
          )
          .get(r.salesPointId, r.startSerial, r.endSerial) as
          | { c: number }
          | undefined;
        usedPages = countRow?.c ?? 0;
      } else {
        const countRow = db
          .prepare(
            `SELECT COUNT(*) AS c
             FROM DeliveryOrder
             WHERE salesPointId = ?
               AND deliveryOrderNo NOT GLOB '*[^0-9]*'
               AND length(deliveryOrderNo) > 0
               AND CAST(deliveryOrderNo AS INTEGER) >= CAST(? AS INTEGER)
               AND CAST(deliveryOrderNo AS INTEGER) <= CAST(? AS INTEGER)`,
          )
          .get(r.salesPointId, r.startSerial, r.endSerial) as
          | { c: number }
          | undefined;
        usedPages = countRow?.c ?? 0;
      }
    } catch {
      usedPages = 0;
    }

    return {
      id: r.id,
      documentKind: r.documentKind,
      bookletCode: r.bookletCode,
      startSerial: r.startSerial,
      endSerial: r.endSerial,
      salesPointId: r.salesPointId,
      salesPointName: r.salesPointName ?? undefined,
      status: r.status,
      issuedAt: r.issuedAt,
      issuedByUserId: r.issuedByUserId,
      issuedByUserName: r.issuedByUserName,
      validatedAt: r.validatedAt,
      validatedByUserId: r.validatedByUserId,
      validatedByUserName: r.validatedByUserName,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      totalPages,
      usedPages,
    };
  });
}

export function createDocumentBooklet(
  sessionUser: { id: string; role: string },
  input: CreateDocumentBookletInput,
): { ok: true; booklet: DocumentBookletRow } | { ok: false; error: string } {
  if (
    input.documentKind !== "SALES_INVOICE" &&
    input.documentKind !== "DELIVERY_ORDER"
  ) {
    return { ok: false, error: "Invalid document kind." };
  }

  const rangeRes = validateBookletRange(input.startSerial, input.endSerial);
  if (!rangeRes.ok) {
    return { ok: false, error: rangeRes.error };
  }

  const db = getDatabase();

  const sp = db
    .prepare(`SELECT id, name, isActive FROM SalesPoint WHERE id = ?`)
    .get(input.salesPointId) as
    | { id: number; name: string; isActive: number }
    | undefined;

  if (!sp) {
    return { ok: false, error: "Collection point does not exist." };
  }

  // Check overlap against all ACTIVE booklets of the same documentKind
  const activeBooklets = db
    .prepare(
      `SELECT b.id, b.bookletCode, b.startSerial, b.endSerial, b.salesPointId, sp.name AS salesPointName
       FROM DocumentBooklet b
       LEFT JOIN SalesPoint sp ON sp.id = b.salesPointId
       WHERE b.documentKind = ? AND b.status = 'ACTIVE'`,
    )
    .all(input.documentKind) as Array<{
      id: string;
      bookletCode: string | null;
      startSerial: string;
      endSerial: string;
      salesPointId: number;
      salesPointName: string | null;
    }>;

  for (const existing of activeBooklets) {
    if (
      doRangesOverlap(
        rangeRes.startSerial,
        rangeRes.endSerial,
        existing.startSerial,
        existing.endSerial,
      )
    ) {
      const codeOrRange =
        existing.bookletCode ||
        `${existing.startSerial} - ${existing.endSerial}`;
      return {
        ok: false,
        error: `Serial range ${rangeRes.startSerial} - ${rangeRes.endSerial} overlaps with active booklet "${codeOrRange}" issued to ${existing.salesPointName ?? "another collection point"}.`,
      };
    }
  }

  const canValidate = canPerformAction(
    sessionUser.role,
    "validate_document_booklets",
  );
  const shouldActivate = input.activateImmediately === true && canValidate;
  const now = new Date().toISOString();

  const status: DocumentBookletStatus = shouldActivate ? "ACTIVE" : "PENDING";
  const validatedAt: string | null = shouldActivate ? now : null;
  const validatedByUserId: string | null = shouldActivate ? sessionUser.id : null;

  const id = crypto.randomUUID();
  const bookletCode = input.bookletCode?.trim() || null;
  const notes = input.notes?.trim() || null;

  db.prepare(
    `INSERT INTO DocumentBooklet (
       id,
       documentKind,
       bookletCode,
       startSerial,
       endSerial,
       salesPointId,
       status,
       issuedAt,
       issuedByUserId,
       validatedAt,
       validatedByUserId,
       notes,
       createdAt,
       updatedAt
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.documentKind,
    bookletCode,
    rangeRes.startSerial,
    rangeRes.endSerial,
    input.salesPointId,
    status,
    now,
    sessionUser.id,
    validatedAt,
    validatedByUserId,
    notes,
    now,
    now,
  );

  return {
    ok: true,
    booklet: {
      id,
      documentKind: input.documentKind,
      bookletCode,
      startSerial: rangeRes.startSerial,
      endSerial: rangeRes.endSerial,
      salesPointId: input.salesPointId,
      salesPointName: sp.name,
      status,
      issuedAt: now,
      issuedByUserId: sessionUser.id,
      validatedAt,
      validatedByUserId,
      notes,
      createdAt: now,
      updatedAt: now,
      totalPages: rangeRes.totalPages,
      usedPages: 0,
    },
  };
}

export function validateDocumentBooklet(
  sessionUser: { id: string; role: string },
  bookletId: string,
): ValidateDocumentBookletResult {
  if (!canPerformAction(sessionUser.role, "validate_document_booklets")) {
    return {
      ok: false,
      error: "You do not have permission to validate document booklets.",
    };
  }

  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT b.id, b.documentKind, b.bookletCode, b.startSerial, b.endSerial, b.salesPointId, b.status, sp.name AS salesPointName
       FROM DocumentBooklet b
       LEFT JOIN SalesPoint sp ON sp.id = b.salesPointId
       WHERE b.id = ?`,
    )
    .get(bookletId) as
    | {
        id: string;
        documentKind: DocumentBookletKind;
        bookletCode: string | null;
        startSerial: string;
        endSerial: string;
        salesPointId: number;
        status: DocumentBookletStatus;
        salesPointName: string | null;
      }
    | undefined;

  if (!existing) {
    return { ok: false, error: "Booklet not found." };
  }

  if (existing.status !== "PENDING") {
    return {
      ok: false,
      error: `Booklet cannot be validated because its current status is ${existing.status}.`,
    };
  }

  // Check overlap against ACTIVE booklets (excluding self)
  const activeBooklets = db
    .prepare(
      `SELECT b.id, b.bookletCode, b.startSerial, b.endSerial, b.salesPointId, sp.name AS salesPointName
       FROM DocumentBooklet b
       LEFT JOIN SalesPoint sp ON sp.id = b.salesPointId
       WHERE b.documentKind = ? AND b.status = 'ACTIVE' AND b.id != ?`,
    )
    .all(existing.documentKind, bookletId) as Array<{
      id: string;
      bookletCode: string | null;
      startSerial: string;
      endSerial: string;
      salesPointId: number;
      salesPointName: string | null;
    }>;

  for (const act of activeBooklets) {
    if (
      doRangesOverlap(
        existing.startSerial,
        existing.endSerial,
        act.startSerial,
        act.endSerial,
      )
    ) {
      const codeOrRange =
        act.bookletCode || `${act.startSerial} - ${act.endSerial}`;
      return {
        ok: false,
        error: `Serial range ${existing.startSerial} - ${existing.endSerial} overlaps with active booklet "${codeOrRange}" issued to ${act.salesPointName ?? "another collection point"}.`,
      };
    }
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE DocumentBooklet
     SET status = 'ACTIVE',
         validatedAt = ?,
         validatedByUserId = ?,
         updatedAt = ?
     WHERE id = ?`,
  ).run(now, sessionUser.id, now, bookletId);

  const loaded = listDocumentBooklets({ status: "ALL" }).find(
    (b) => b.id === bookletId,
  );
  if (!loaded) {
    return { ok: false, error: "Failed to reload validated booklet." };
  }
  return { ok: true, booklet: loaded };
}

export function rejectDocumentBooklet(
  sessionUser: { id: string; role: string },
  bookletId: string,
  reason?: string,
): RejectDocumentBookletResult {
  if (!canPerformAction(sessionUser.role, "validate_document_booklets")) {
    return {
      ok: false,
      error: "You do not have permission to reject document booklets.",
    };
  }

  const db = getDatabase();
  const existing = db
    .prepare(`SELECT id, status, notes FROM DocumentBooklet WHERE id = ?`)
    .get(bookletId) as
    | { id: string; status: DocumentBookletStatus; notes: string | null }
    | undefined;

  if (!existing) {
    return { ok: false, error: "Booklet not found." };
  }

  if (existing.status !== "PENDING") {
    return {
      ok: false,
      error: `Booklet cannot be rejected because its current status is ${existing.status}.`,
    };
  }

  const now = new Date().toISOString();
  const rejectNote = reason?.trim()
    ? `[Rejected on ${now.slice(0, 10)}: ${reason.trim()}]`
    : `[Rejected on ${now.slice(0, 10)}]`;
  const updatedNotes = existing.notes
    ? `${existing.notes}\n${rejectNote}`
    : rejectNote;

  db.prepare(
    `UPDATE DocumentBooklet
     SET status = 'REJECTED',
         notes = ?,
         updatedAt = ?
     WHERE id = ?`,
  ).run(updatedNotes, now, bookletId);

  return { ok: true };
}

export function validateManyBooklets(
  sessionUser: { id: string; role: string },
  bookletIds: string[],
): ValidateManyBookletsResult {
  if (!canPerformAction(sessionUser.role, "validate_document_booklets")) {
    return {
      ok: false,
      validated: 0,
      errors: [],
      error: "You do not have permission to validate document booklets.",
    };
  }

  let validated = 0;
  const errors: Array<{ id: string; error: string; bookletCode?: string | null }> = [];

  for (const id of bookletIds) {
    const res = validateDocumentBooklet(sessionUser, id);
    if (res.ok) {
      validated++;
    } else {
      errors.push({ id, error: res.error });
    }
  }

  return {
    ok: errors.length === 0,
    validated,
    errors,
  };
}

export function cancelDocumentBooklet(
  _sessionUser: { id: string; role: string },
  bookletId: string,
  reason?: string,
): { ok: true } | { ok: false; error: string } {
  const db = getDatabase();
  const existing = db
    .prepare(`SELECT id, status, notes FROM DocumentBooklet WHERE id = ?`)
    .get(bookletId) as
    | { id: string; status: DocumentBookletStatus; notes: string | null }
    | undefined;

  if (!existing) {
    return { ok: false, error: "Booklet not found." };
  }

  if (existing.status === "CANCELLED") {
    return { ok: false, error: "Booklet is already cancelled." };
  }

  const now = new Date().toISOString();
  const cancelNote = reason?.trim()
    ? `[Cancelled on ${now.slice(0, 10)}: ${reason.trim()}]`
    : `[Cancelled on ${now.slice(0, 10)}]`;
  const updatedNotes = existing.notes
    ? `${existing.notes}\n${cancelNote}`
    : cancelNote;

  db.prepare(
    `UPDATE DocumentBooklet
     SET status = 'CANCELLED',
         notes = ?,
         updatedAt = ?
     WHERE id = ?`,
  ).run(updatedNotes, now, bookletId);

  return { ok: true };
}

export function validateSerialForSalesPoint(
  input: ValidateSerialForSalesPointInput,
): ValidateSerialForSalesPointResult {
  const serialRes = validateBookletSerial(input.serial);
  if (!serialRes.ok) {
    return { ok: false, error: serialRes.error };
  }

  const db = getDatabase();

  const spRow = db
    .prepare(`SELECT name FROM SalesPoint WHERE id = ?`)
    .get(input.salesPointId) as { name: string } | undefined;
  const currentSpName =
    spRow?.name ?? `Collection point #${input.salesPointId}`;

  const allActiveBooklets = db
    .prepare(
      `SELECT b.id, b.bookletCode, b.startSerial, b.endSerial, b.salesPointId, sp.name AS salesPointName
       FROM DocumentBooklet b
       LEFT JOIN SalesPoint sp ON sp.id = b.salesPointId
       WHERE b.documentKind = ? AND b.status = 'ACTIVE'`,
    )
    .all(input.documentKind) as Array<{
      id: string;
      bookletCode: string | null;
      startSerial: string;
      endSerial: string;
      salesPointId: number;
      salesPointName: string | null;
    }>;

  const matchingForCurrentSp = allActiveBooklets.find(
    (b) =>
      b.salesPointId === input.salesPointId &&
      isSerialInRange(serialRes.serial, b.startSerial, b.endSerial),
  );

  if (matchingForCurrentSp) {
    return {
      ok: true,
      bookletId: matchingForCurrentSp.id,
      bookletCode: matchingForCurrentSp.bookletCode,
    };
  }

  const matchingOtherSp = allActiveBooklets.find((b) =>
    isSerialInRange(serialRes.serial, b.startSerial, b.endSerial),
  );

  if (matchingOtherSp) {
    const otherName =
      matchingOtherSp.salesPointName ??
      `Collection point #${matchingOtherSp.salesPointId}`;
    return {
      ok: false,
      error: `Serial ${serialRes.serial} belongs to booklet ${matchingOtherSp.bookletCode || matchingOtherSp.startSerial + "–" + matchingOtherSp.endSerial} issued to ${otherName}, not ${currentSpName}.`,
    };
  }

  return {
    ok: false,
    error: `Serial ${serialRes.serial} does not belong to any active booklet issued to ${currentSpName}.`,
  };
}
