import type {
  ConsignmentDoContext,
  ConsignmentMutationResult,
  ConsignmentNoteSnapshot,
  ConsignmentNoteStatus,
  ConsignmentPrintPayload,
  ConsignmentSaleLine,
  ConsignmentSaleSnapshot,
  ConsignmentValidateManyResult,
  ConsignmentValidationQueuePage,
  LoadedConsignmentFormView,
  SaveConsignmentNoteInput,
  SaveConsignmentNoteResult,
  LoadSaleForConsignmentResult,
} from "../../shared/vehicleConsignmentNotes.types.js";
import type {
  SaleDisposition,
  SaleProductMode,
} from "../../shared/sales.types.js";
import { formatKgInTonsAndKilosWords } from "../../shared/formatKgInWords.js";
import {
  assertRouteWrite,
  canPerformAction,
} from "../auth/permissions/service.js";
import {
  deleteConsignmentDetails,
  insertConsignmentDetails,
  updateConsignmentDetails,
} from "../consignmentDetails/service.js";
import { createTextPrimaryKey } from "../db/tableMeta.js";
import { getDatabase } from "../db/index.js";
import { trimQty } from "../sales/money.js";
import { allocateConsignmentNoteNo } from "./vcnNo.js";

const NOTE_SELECT = `
  SELECT n.id,
         n.consignmentNoteNo,
         n.destination,
         n.dateOfLifting,
         n.vehicleNumber,
         n.consignmentDetailsId,
         n.status,
         n.validatedAt,
         d.consignerName,
         d.consignerDesignation,
         d.dateOfConsignment,
         d.receiverName,
         d.receiverNicNo,
         d.receiverNicPlaceOfIssue,
         d.receivedDate,
         vu.name AS validatedByName
  FROM VehicleConsignmentNote n
  INNER JOIN ConsignmentDetails d ON d.id = n.consignmentDetailsId
  LEFT JOIN User vu ON vu.id = n.validatedByUserId`;

interface ExistingNoteRecord {
  id: string;
  consignmentNoteNo: string;
  consignmentDetailsId: string;
  status: ConsignmentNoteStatus;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyDoContext(): ConsignmentDoContext {
  return {
    paidQtyKg: "—",
    liftedQtyKg: "—",
    balanceQtyKg: "—",
    deliveryOrderDate: null,
  };
}

function buildDoContext(deliveryOrderNo: string | null): ConsignmentDoContext {
  if (!deliveryOrderNo?.trim()) {
    return emptyDoContext();
  }

  const db = getDatabase();
  const order = db
    .prepare(
      `SELECT id, deliveryOrderNo, dateIssued FROM DeliveryOrder WHERE deliveryOrderNo = ?`,
    )
    .get(deliveryOrderNo.trim()) as
    | { id: number; deliveryOrderNo: string; dateIssued: string }
    | undefined;

  if (!order) {
    return emptyDoContext();
  }

  const detailRows = db
    .prepare(
      `SELECT productId, orderQty FROM DeliveryOrderDetails WHERE deliveryOrderId = ?`,
    )
    .all(order.id) as Array<{ productId: number; orderQty: number }>;

  let paidTotal = 0;
  let liftedTotal = 0;
  for (const detail of detailRows) {
    const orderQty = Number(detail.orderQty) || 0;
    paidTotal += orderQty;
    const liftedRow = db
      .prepare(
        `SELECT COALESCE(SUM(CAST(sl.qtyKg AS REAL)), 0) AS liftedQty
         FROM Sale s
         INNER JOIN SaleLine sl ON sl.saleId = s.id
         WHERE s.deliveryOrderNo = ?
           AND sl.productId = ?
           AND s.status IN ('PENDING', 'VALIDATED')`,
      )
      .get(order.deliveryOrderNo, detail.productId) as { liftedQty: number };
    liftedTotal += Number(liftedRow.liftedQty) || 0;
  }

  const balanceTotal = Math.max(paidTotal - liftedTotal, 0);
  return {
    paidQtyKg: trimQty(paidTotal),
    liftedQtyKg: trimQty(liftedTotal),
    balanceQtyKg: trimQty(balanceTotal),
    deliveryOrderDate: String(order.dateIssued).slice(0, 10),
  };
}

function loadSaleLines(saleId: string): ConsignmentSaleLine[] {
  const rows = getDatabase()
    .prepare(
      `SELECT p.productName, sl.qtyKg, sl.qtyUnits
       FROM SaleLine sl
       INNER JOIN Product p ON p.productId = sl.productId
       WHERE sl.saleId = ?
       ORDER BY sl.id ASC`,
    )
    .all(saleId) as Array<{
    productName: string;
    qtyKg: string;
    qtyUnits: string | null;
  }>;

  return rows.map((row) => ({
    productName: String(row.productName),
    qtyKg: trimQty(Number(row.qtyKg) || 0),
    qtyUnits: row.qtyUnits != null ? String(row.qtyUnits) : null,
  }));
}

function sumSaleLiftedQtyKg(saleId: string): string {
  const row = getDatabase()
    .prepare(
      `SELECT COALESCE(SUM(CAST(qtyKg AS REAL)), 0) AS qty
       FROM SaleLine WHERE saleId = ?`,
    )
    .get(saleId) as { qty: number };
  return trimQty(Number(row.qty) || 0);
}

function mapNoteRow(
  row: Record<string, unknown>,
): ConsignmentNoteSnapshot {
  return {
    id: String(row.id),
    consignmentNoteNo: String(row.consignmentNoteNo),
    destination: String(row.destination),
    dateOfLifting: String(row.dateOfLifting).slice(0, 10),
    vehicleNumber: String(row.vehicleNumber),
    consignerName: String(row.consignerName),
    consignerDesignation: String(row.consignerDesignation),
    dateOfConsignment: String(row.dateOfConsignment).slice(0, 10),
    receiverName: String(row.receiverName),
    receiverNicNo: row.receiverNicNo != null ? String(row.receiverNicNo) : "",
    receiverNicPlaceOfIssue:
      row.receiverNicPlaceOfIssue != null
        ? String(row.receiverNicPlaceOfIssue)
        : "",
    receivedDate: row.receivedDate ? String(row.receivedDate).slice(0, 10) : null,
    status: String(row.status) as ConsignmentNoteStatus,
    validatedAtIso: row.validatedAt ? String(row.validatedAt) : null,
    validatedByName: row.validatedByName ? String(row.validatedByName) : null,
  };
}

function loadNoteBySaleId(saleId: string): ConsignmentNoteSnapshot | null {
  const row = getDatabase()
    .prepare(`${NOTE_SELECT} WHERE n.saleId = ?`)
    .get(saleId) as Record<string, unknown> | undefined;
  return row ? mapNoteRow(row) : null;
}

function loadExistingNoteBySaleId(saleId: string): ExistingNoteRecord | null {
  const row = getDatabase()
    .prepare(
      `SELECT id, consignmentNoteNo, consignmentDetailsId, status
       FROM VehicleConsignmentNote WHERE saleId = ?`,
    )
    .get(saleId) as ExistingNoteRecord | undefined;
  return row ?? null;
}

function loadNoteById(noteId: string): ConsignmentNoteSnapshot | null {
  const row = getDatabase()
    .prepare(`${NOTE_SELECT} WHERE n.id = ?`)
    .get(noteId) as Record<string, unknown> | undefined;
  return row ? mapNoteRow(row) : null;
}

const NORMAL_BOTTLE_VCN_ERROR =
  "Consignment notes are not allowed for normal Bottle Oil sales.";

function isNormalBottleSale(
  mode: SaleProductMode | null,
  disposition: SaleDisposition | null,
): boolean {
  return (
    mode === "BOTTLE" && (disposition == null || disposition === "NORMAL")
  );
}

function parseSaleProductMode(value: unknown): SaleProductMode | null {
  return value === "BOTTLE" || value === "LOOSE" ? value : null;
}

function parseSaleDisposition(value: unknown): SaleDisposition | null {
  return value === "NORMAL" ||
    value === "RATION" ||
    value === "PUBLIC_RELATION"
    ? value
    : null;
}

function loadSaleSnapshot(saleId: string): ConsignmentSaleSnapshot | null {
  const sale = getDatabase()
    .prepare(
      `SELECT s.id, s.invoiceNo, s.status, s.vehicleNumber, s.soldAt,
              s.deliveryOrderNo, s.customerNameSnapshot, s.customerId,
              s.saleProductMode, s.saleDisposition,
              sp.name AS salesPointName,
              c.address AS customerAddress
       FROM Sale s
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       LEFT JOIN Customer c ON c.id = s.customerId
       WHERE s.id = ?`,
    )
    .get(saleId) as Record<string, unknown> | undefined;

  if (!sale) {
    return null;
  }

  const saleIdStr = String(sale.id);

  return {
    id: saleIdStr,
    invoiceNo: String(sale.invoiceNo),
    status: String(sale.status) as ConsignmentNoteStatus,
    saleProductMode: parseSaleProductMode(sale.saleProductMode),
    saleDisposition: parseSaleDisposition(sale.saleDisposition),
    salesPointName: sale.salesPointName ? String(sale.salesPointName) : null,
    customerName: String(sale.customerNameSnapshot),
    customerAddress: sale.customerAddress ? String(sale.customerAddress) : null,
    vehicleNumber: String(sale.vehicleNumber ?? ""),
    soldAtIso: String(sale.soldAt),
    deliveryOrderNo: sale.deliveryOrderNo ? String(sale.deliveryOrderNo) : null,
    thisSaleLiftedQtyKg: sumSaleLiftedQtyKg(saleIdStr),
    saleLines: loadSaleLines(saleIdStr),
  };
}

function buildFormView(saleId: string): LoadedConsignmentFormView | null {
  const sale = loadSaleSnapshot(saleId);
  if (!sale) {
    return null;
  }
  return {
    sale,
    note: loadNoteBySaleId(saleId),
    doContext: buildDoContext(sale.deliveryOrderNo),
  };
}

export function loadSaleForConsignmentByInvoice(
  invoiceNo: string,
): LoadSaleForConsignmentResult {
  const trimmed = invoiceNo.trim();
  if (!trimmed) {
    return { ok: false, error: "No sale matches that invoice number." };
  }

  const sale = getDatabase()
    .prepare(`SELECT id FROM Sale WHERE invoiceNo = ?`)
    .get(trimmed) as { id: string } | undefined;

  if (!sale) {
    return { ok: false, error: "No sale matches that invoice number." };
  }

  const view = buildFormView(String(sale.id));
  if (!view) {
    return { ok: false, error: "No sale matches that invoice number." };
  }

  if (
    isNormalBottleSale(view.sale.saleProductMode, view.sale.saleDisposition)
  ) {
    return { ok: false, error: NORMAL_BOTTLE_VCN_ERROR };
  }

  return { ok: true, data: view };
}

export function loadConsignmentByVcnNo(
  vcnNo: string,
): LoadedConsignmentFormView | null {
  const trimmed = vcnNo.trim();
  if (!trimmed) {
    return null;
  }

  const note = getDatabase()
    .prepare(
      `SELECT saleId FROM VehicleConsignmentNote WHERE consignmentNoteNo = ?`,
    )
    .get(trimmed) as { saleId: string } | undefined;

  if (!note) {
    return null;
  }

  return buildFormView(String(note.saleId));
}

function requireUserRole(
  userId: string,
): { ok: true; role: string } | { ok: false; error: string } {
  if (!userId) {
    return { ok: false, error: "Login required." };
  }
  const user = getDatabase()
    .prepare(`SELECT role FROM User WHERE id = ?`)
    .get(userId) as { role: string } | undefined;
  if (!user) {
    return { ok: false, error: "User not found." };
  }
  return { ok: true, role: user.role };
}

function requireNonEmpty(value: string, label: string): string | null {
  if (!value.trim()) {
    return `${label} is required.`;
  }
  return null;
}

export function saveConsignmentNote(
  input: SaveConsignmentNoteInput,
): SaveConsignmentNoteResult {
  const auth = requireUserRole(input.userId);
  if (!auth.ok) {
    return auth;
  }

  try {
    assertRouteWrite(auth.role, "vehicle-consignment-notes");
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Permission denied.",
    };
  }

  const sale = loadSaleSnapshot(input.saleId);
  if (!sale) {
    return { ok: false, error: "Sale not found." };
  }

  if (sale.status !== "VALIDATED") {
    return {
      ok: false,
      error: "Validate the sale before saving a consignment note.",
    };
  }

  if (isNormalBottleSale(sale.saleProductMode, sale.saleDisposition)) {
    return { ok: false, error: NORMAL_BOTTLE_VCN_ERROR };
  }

  const checks = [
    requireNonEmpty(input.destination, "Destination"),
    requireNonEmpty(input.dateOfLifting, "Date of lifting"),
    requireNonEmpty(input.vehicleNumber, "Vehicle number"),
    requireNonEmpty(input.consignerName, "Consigner name"),
    requireNonEmpty(input.consignerDesignation, "Consigner designation"),
    requireNonEmpty(input.dateOfConsignment, "Date of consignment"),
    requireNonEmpty(input.receiverName, "Receiver name"),
    requireNonEmpty(input.receiverNicNo, "Receiver NIC number"),
    requireNonEmpty(input.receiverNicPlaceOfIssue, "Place of issue (NIC)"),
  ];
  for (const err of checks) {
    if (err) {
      return { ok: false, error: err };
    }
  }

  const db = getDatabase();
  const existing = loadExistingNoteBySaleId(sale.id);
  const receivedDate = input.receivedDate?.trim() || null;
  const stamp = nowIso();
  const detailsInput = {
    saleId: sale.id,
    consignerName: input.consignerName.trim(),
    consignerDesignation: input.consignerDesignation.trim(),
    dateOfConsignment: input.dateOfConsignment.trim().slice(0, 10),
    receiverName: input.receiverName.trim(),
    receiverNicNo: input.receiverNicNo.trim(),
    receiverNicPlaceOfIssue: input.receiverNicPlaceOfIssue.trim(),
    receivedDate,
  };

  if (existing) {
    if (input.noteId && input.noteId !== existing.id) {
      return { ok: false, error: "Consignment note does not match this sale." };
    }
    if (existing.status !== "PENDING") {
      return {
        ok: false,
        error: "Only pending consignment notes can be edited.",
      };
    }

    const tx = db.transaction(() => {
      updateConsignmentDetails(existing.consignmentDetailsId, detailsInput, stamp);
      db.prepare(
        `UPDATE VehicleConsignmentNote
         SET destination = ?,
             dateOfLifting = ?,
             vehicleNumber = ?,
             updatedAt = ?
         WHERE id = ?`,
      ).run(
        input.destination.trim(),
        input.dateOfLifting.trim().slice(0, 10),
        input.vehicleNumber.trim(),
        stamp,
        existing.id,
      );
    });
    tx();

    return {
      ok: true,
      id: existing.id,
      consignmentNoteNo: existing.consignmentNoteNo,
    };
  }

  if (input.noteId) {
    return { ok: false, error: "Consignment note not found for this sale." };
  }

  const id = createTextPrimaryKey();
  const consignmentNoteNo = allocateConsignmentNoteNo(db);

  const tx = db.transaction(() => {
    const consignmentDetailsId = insertConsignmentDetails(detailsInput, stamp);
    db.prepare(
      `INSERT INTO VehicleConsignmentNote (
         id, consignmentNoteNo, saleId, destination, dateOfLifting, vehicleNumber,
         consignmentDetailsId, status, createdByUserId, createdAt, updatedAt
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
    ).run(
      id,
      consignmentNoteNo,
      sale.id,
      input.destination.trim(),
      input.dateOfLifting.trim().slice(0, 10),
      input.vehicleNumber.trim(),
      consignmentDetailsId,
      input.userId,
      stamp,
      stamp,
    );
  });
  tx();

  return { ok: true, id, consignmentNoteNo };
}

export function deleteConsignmentNote(
  noteId: string,
  userId: string,
): ConsignmentMutationResult {
  const auth = requireUserRole(userId);
  if (!auth.ok) {
    return auth;
  }

  try {
    assertRouteWrite(auth.role, "vehicle-consignment-notes");
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Permission denied.",
    };
  }

  const note = loadNoteById(noteId);
  if (!note) {
    return { ok: false, error: "Consignment note not found." };
  }
  if (note.status !== "PENDING") {
    return {
      ok: false,
      error: "Only pending consignment notes can be deleted.",
    };
  }

  const detailsRow = getDatabase()
    .prepare(
      `SELECT consignmentDetailsId FROM VehicleConsignmentNote WHERE id = ?`,
    )
    .get(noteId) as { consignmentDetailsId: string } | undefined;

  if (!detailsRow) {
    return { ok: false, error: "Consignment note not found." };
  }

  deleteConsignmentDetails(detailsRow.consignmentDetailsId);

  return { ok: true };
}

export function validateConsignmentNote(
  noteId: string,
  userId: string,
): ConsignmentMutationResult {
  const auth = requireUserRole(userId);
  if (!auth.ok) {
    return auth;
  }

  if (!canPerformAction(auth.role, "validate_vehicle_consignment_notes")) {
    return {
      ok: false,
      error: "You do not have permission to validate consignment notes.",
    };
  }

  const note = loadNoteById(noteId);
  if (!note) {
    return { ok: false, error: "Consignment note not found." };
  }

  if (note.status === "VALIDATED") {
    return { ok: true };
  }

  if (note.status !== "PENDING") {
    return {
      ok: false,
      error: "Only pending consignment notes can be validated.",
    };
  }

  getDatabase()
    .prepare(
      `UPDATE VehicleConsignmentNote
       SET status = 'VALIDATED',
           validatedAt = ?,
           validatedByUserId = ?,
           updatedAt = ?
       WHERE id = ?`,
    )
    .run(nowIso(), userId, nowIso(), noteId);

  return { ok: true };
}

const VALIDATION_QUEUE_LIMIT = 200;

export function listConsignmentValidationQueue(
  userId: string,
): ConsignmentValidationQueuePage {
  const auth = requireUserRole(userId);
  if (!auth.ok) {
    throw new Error(auth.error);
  }
  if (!canPerformAction(auth.role, "validate_vehicle_consignment_notes")) {
    throw new Error("You do not have permission to validate consignment notes.");
  }

  const user = getDatabase()
    .prepare(`SELECT salesPointId, isActive FROM User WHERE id = ?`)
    .get(userId) as { salesPointId: number | null; isActive: number } | undefined;
  if (!user?.isActive) {
    throw new Error("Login required.");
  }

  const scoped = user.salesPointId;
  const scopeSql =
    scoped == null ? "" : " AND s.salesPointId = @scopedSalesPointId";
  const params = { scopedSalesPointId: scoped ?? -1 };

  const totalPending = (
    getDatabase()
      .prepare(
        `SELECT COUNT(*) AS count
         FROM VehicleConsignmentNote n
         INNER JOIN Sale s ON s.id = n.saleId
         WHERE n.status = 'PENDING'${scopeSql}`,
      )
      .get(params) as { count: number }
  ).count;

  const rows = getDatabase()
    .prepare(
      `SELECT n.id,
              n.consignmentNoteNo,
              n.destination,
              d.dateOfConsignment,
              s.invoiceNo,
              s.customerNameSnapshot,
              s.saleDisposition,
              sp.name AS salesPointName,
              COALESCE(u.name, '—') AS createdByName
       FROM VehicleConsignmentNote n
       INNER JOIN ConsignmentDetails d ON d.id = n.consignmentDetailsId
       INNER JOIN Sale s ON s.id = n.saleId
       LEFT JOIN SalesPoint sp ON sp.id = s.salesPointId
       LEFT JOIN User u ON u.id = n.createdByUserId
       WHERE n.status = 'PENDING'${scopeSql}
       ORDER BY d.dateOfConsignment ASC, n.consignmentNoteNo ASC
       LIMIT ${VALIDATION_QUEUE_LIMIT}`,
    )
    .all(params) as Array<{
    id: string;
    consignmentNoteNo: string;
    destination: string;
    dateOfConsignment: string;
    invoiceNo: string;
    customerNameSnapshot: string;
    saleDisposition: string | null;
    salesPointName: string | null;
    createdByName: string;
  }>;

  return {
    totalPending,
    rows: rows.map((row) => ({
      id: String(row.id),
      consignmentNoteNo: String(row.consignmentNoteNo),
      invoiceNo: String(row.invoiceNo),
      customerName: String(row.customerNameSnapshot),
      salesPointName: row.salesPointName ? String(row.salesPointName) : null,
      destination: String(row.destination),
      saleDisposition:
        row.saleDisposition === "NORMAL" ||
        row.saleDisposition === "RATION" ||
        row.saleDisposition === "PUBLIC_RELATION"
          ? row.saleDisposition
          : null,
      dateOfConsignment: String(row.dateOfConsignment).slice(0, 10),
      createdByName: String(row.createdByName),
    })),
  };
}

export function validateManyConsignmentNotes(payload: {
  userId: string;
  noteIds: string[];
}): ConsignmentValidateManyResult {
  const uniqueIds = [
    ...new Set(
      payload.noteIds.filter((id) => typeof id === "string" && id.trim()),
    ),
  ];
  if (uniqueIds.length === 0) {
    return { ok: false, error: "Select at least one consignment note." };
  }

  let validated = 0;
  const errors: Array<{
    id: string;
    consignmentNoteNo?: string;
    error: string;
  }> = [];

  for (const id of uniqueIds) {
    const result = validateConsignmentNote(id, payload.userId);
    if (result.ok) {
      validated += 1;
    } else {
      const noteNo = getDatabase()
        .prepare(`SELECT consignmentNoteNo FROM VehicleConsignmentNote WHERE id = ?`)
        .get(id) as { consignmentNoteNo: string } | undefined;
      errors.push({
        id,
        consignmentNoteNo: noteNo?.consignmentNoteNo,
        error: result.error,
      });
    }
  }

  return { ok: true, validated, errors };
}

export function getConsignmentPrintPayload(
  noteId: string,
): ConsignmentPrintPayload | null {
  const note = loadNoteById(noteId);
  if (!note) {
    return null;
  }

  const saleRow = getDatabase()
    .prepare(`SELECT saleId FROM VehicleConsignmentNote WHERE id = ?`)
    .get(noteId) as { saleId: string } | undefined;
  if (!saleRow) {
    return null;
  }

  const sale = loadSaleSnapshot(String(saleRow.saleId));
  if (!sale) {
    return null;
  }

  const company = getDatabase()
    .prepare(
      `SELECT companyName, department FROM CompanySettings WHERE id = 'default'`,
    )
    .get() as { companyName: string; department: string | null } | undefined;

  const doContext = buildDoContext(sale.deliveryOrderNo);
  const liftedQtyInWords = formatKgInTonsAndKilosWords(
    sale.thisSaleLiftedQtyKg,
  );

  return {
    note,
    sale,
    doContext,
    companyName: company?.companyName ? String(company.companyName) : null,
    department: company?.department ? String(company.department) : null,
    liftedQtyInWords,
  };
}
