import type { SaleDisposition } from "./sales.types.js";

export type ConsignmentNoteStatus = "PENDING" | "VALIDATED" | "REJECTED";

export interface ConsignmentDoContext {
  paidQtyKg: string;
  liftedQtyKg: string;
  balanceQtyKg: string;
  deliveryOrderDate: string | null;
}

export interface ConsignmentSaleLine {
  productName: string;
  qtyKg: string;
  qtyUnits: string | null;
}

export interface ConsignmentSaleSnapshot {
  id: string;
  invoiceNo: string;
  status: ConsignmentNoteStatus;
  saleDisposition: SaleDisposition | null;
  salesPointName: string | null;
  customerName: string;
  customerAddress: string | null;
  vehicleNumber: string;
  soldAtIso: string;
  deliveryOrderNo: string | null;
  thisSaleLiftedQtyKg: string;
  saleLines: ConsignmentSaleLine[];
}

export interface ConsignmentNoteSnapshot {
  id: string;
  consignmentNoteNo: string;
  destination: string;
  dateOfLifting: string;
  vehicleNumber: string;
  consignerName: string;
  consignerDesignation: string;
  dateOfConsignment: string;
  receiverName: string;
  receiverNicNo: string;
  receiverNicPlaceOfIssue: string;
  receivedDate: string | null;
  status: ConsignmentNoteStatus;
  validatedAtIso: string | null;
  validatedByName: string | null;
}

export interface LoadedConsignmentFormView {
  sale: ConsignmentSaleSnapshot;
  note: ConsignmentNoteSnapshot | null;
  doContext: ConsignmentDoContext;
}

export interface SaveConsignmentNoteInput {
  userId: string;
  saleId: string;
  noteId?: string | null;
  destination: string;
  dateOfLifting: string;
  vehicleNumber: string;
  consignerName: string;
  consignerDesignation: string;
  dateOfConsignment: string;
  receiverName: string;
  receiverNicNo: string;
  receiverNicPlaceOfIssue: string;
  receivedDate?: string | null;
}

export type SaveConsignmentNoteResult =
  | { ok: true; id: string; consignmentNoteNo: string }
  | { ok: false; error: string };

export type ConsignmentMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export interface ConsignmentPrintPayload {
  note: ConsignmentNoteSnapshot;
  sale: ConsignmentSaleSnapshot;
  doContext: ConsignmentDoContext;
  companyName: string | null;
  department: string | null;
  liftedQtyInWords: string | null;
}

export interface ConsignmentValidationQueueRow {
  id: string;
  consignmentNoteNo: string;
  invoiceNo: string;
  customerName: string;
  salesPointName: string | null;
  destination: string;
  saleDisposition: SaleDisposition | null;
  dateOfConsignment: string;
  createdByName: string;
}

export interface ConsignmentValidationQueuePage {
  totalPending: number;
  rows: ConsignmentValidationQueueRow[];
}

export type ConsignmentValidateManyResult =
  | {
      ok: true;
      validated: number;
      errors: Array<{ id: string; consignmentNoteNo?: string; error: string }>;
    }
  | { ok: false; error: string };
