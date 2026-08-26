import { ipcMain } from "electron";
import type {
  ConsignmentMutationResult,
  ConsignmentPrintPayload,
  ConsignmentValidateManyResult,
  ConsignmentValidationQueuePage,
  LoadedConsignmentFormView,
  SaveConsignmentNoteInput,
  SaveConsignmentNoteResult,
} from "../../shared/vehicleConsignmentNotes.types.js";
import {
  deleteConsignmentNote,
  getConsignmentPrintPayload,
  listConsignmentValidationQueue,
  loadConsignmentByVcnNo,
  loadSaleForConsignmentByInvoice,
  saveConsignmentNote,
  validateConsignmentNote,
  validateManyConsignmentNotes,
} from "../vehicleConsignmentNotes/service.js";

export function registerVehicleConsignmentNotesHandlers(): void {
  ipcMain.handle(
    "vehicleConsignmentNotes:loadSaleByInvoice",
    (_event, invoiceNo: string): LoadedConsignmentFormView | null => {
      if (typeof invoiceNo !== "string") {
        return null;
      }
      return loadSaleForConsignmentByInvoice(invoiceNo);
    },
  );

  ipcMain.handle(
    "vehicleConsignmentNotes:loadByVcnNo",
    (_event, vcnNo: string): LoadedConsignmentFormView | null => {
      if (typeof vcnNo !== "string") {
        return null;
      }
      return loadConsignmentByVcnNo(vcnNo);
    },
  );

  ipcMain.handle(
    "vehicleConsignmentNotes:save",
    (_event, input: SaveConsignmentNoteInput): SaveConsignmentNoteResult => {
      if (!input?.userId) {
        return { ok: false, error: "Login required." };
      }
      return saveConsignmentNote(input);
    },
  );

  ipcMain.handle(
    "vehicleConsignmentNotes:delete",
    (
      _event,
      payload: { id: string; userId: string },
    ): ConsignmentMutationResult => {
      if (!payload?.userId) {
        return { ok: false, error: "Login required." };
      }
      if (typeof payload.id !== "string") {
        return { ok: false, error: "Consignment note id is required." };
      }
      return deleteConsignmentNote(payload.id, payload.userId);
    },
  );

  ipcMain.handle(
    "vehicleConsignmentNotes:validate",
    (
      _event,
      payload: { id: string; userId: string },
    ): ConsignmentMutationResult => {
      if (!payload?.userId) {
        return { ok: false, error: "Login required." };
      }
      if (typeof payload.id !== "string") {
        return { ok: false, error: "Consignment note id is required." };
      }
      return validateConsignmentNote(payload.id, payload.userId);
    },
  );

  ipcMain.handle(
    "vehicleConsignmentNotes:loadPrintById",
    (_event, noteId: string): ConsignmentPrintPayload | null => {
      if (typeof noteId !== "string") {
        return null;
      }
      return getConsignmentPrintPayload(noteId);
    },
  );

  ipcMain.handle(
    "vehicleConsignmentNotes:listValidationQueue",
    (_event, userId: string): ConsignmentValidationQueuePage => {
      if (typeof userId !== "string") {
        throw new Error("Login required.");
      }
      return listConsignmentValidationQueue(userId);
    },
  );

  ipcMain.handle(
    "vehicleConsignmentNotes:validateMany",
    (
      _event,
      payload: { userId: string; noteIds: string[] },
    ): ConsignmentValidateManyResult => {
      if (!payload?.userId) {
        return { ok: false, error: "Login required." };
      }
      return validateManyConsignmentNotes(payload);
    },
  );
}
