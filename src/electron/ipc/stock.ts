import { ipcMain } from "electron";
import type {
  ReceiveTransferInput,
  SaveAdjustmentInput,
  SaveReceiptInput,
  SaveTransferInput,
  StockBootstrap,
  StockGenericResult,
  StockMutationResult,
} from "../../shared/stock.types.js";
import {
  cancelAdjustment,
  cancelReceipt,
  cancelTransfer,
  dispatchTransfer,
  findAdjustmentByNumber,
  findReceiptByNumber,
  findTransferByNumber,
  getStockBootstrap,
  loadAdjustmentForReview,
  loadReceiptForReview,
  loadTransferForReview,
  postAdjustment,
  postInternalTransfer,
  postReceipt,
  receiveTransfer,
  saveAdjustment,
  saveReceipt,
  saveTransfer,
} from "../stock/service.js";

export function registerStockHandlers(): void {
  ipcMain.handle("stock:getBootstrap", (_event, userId: string): StockBootstrap => {
    if (typeof userId !== "string" || !userId.trim()) {
      throw new Error("Login required.");
    }
    return getStockBootstrap(userId);
  });

  ipcMain.handle(
    "stock:saveReceipt",
    (_event, input: SaveReceiptInput): StockMutationResult => {
      if (!input?.userId) {
        return { ok: false, error: "Login required." };
      }
      return saveReceipt(input);
    },
  );

  ipcMain.handle(
    "stock:postReceipt",
    (_event, payload: { userId: string; receiptId: string }): StockGenericResult => {
      if (!payload?.userId || !payload?.receiptId) {
        return { ok: false, error: "Invalid receipt." };
      }
      return postReceipt(payload.userId, payload.receiptId);
    },
  );

  ipcMain.handle(
    "stock:cancelReceipt",
    (_event, payload: { userId: string; receiptId: string }): StockGenericResult => {
      if (!payload?.userId || !payload?.receiptId) {
        return { ok: false, error: "Invalid receipt." };
      }
      return cancelReceipt(payload.userId, payload.receiptId);
    },
  );

  ipcMain.handle(
    "stock:findReceiptByNumber",
    (_event, payload: { userId: string; receiptNo: string }) => {
      if (!payload?.userId) {
        return { ok: false, error: "Login required." };
      }
      return findReceiptByNumber(payload.userId, payload.receiptNo);
    },
  );

  ipcMain.handle(
    "stock:loadReceiptForReview",
    (_event, payload: { userId: string; receiptId: string }) => {
      if (!payload?.userId || !payload?.receiptId) {
        return { ok: false, error: "Invalid receipt." };
      }
      return loadReceiptForReview(payload.userId, payload.receiptId);
    },
  );

  ipcMain.handle(
    "stock:saveTransfer",
    (_event, input: SaveTransferInput): StockMutationResult => {
      if (!input?.userId) {
        return { ok: false, error: "Login required." };
      }
      return saveTransfer(input);
    },
  );

  ipcMain.handle(
    "stock:dispatchTransfer",
    (_event, payload: { userId: string; transferId: string }): StockGenericResult => {
      if (!payload?.userId || !payload?.transferId) {
        return { ok: false, error: "Invalid transfer." };
      }
      return dispatchTransfer(payload.userId, payload.transferId);
    },
  );

  ipcMain.handle(
    "stock:postInternalTransfer",
    (_event, payload: { userId: string; transferId: string }): StockGenericResult => {
      if (!payload?.userId || !payload?.transferId) {
        return { ok: false, error: "Invalid transfer." };
      }
      return postInternalTransfer(payload.userId, payload.transferId);
    },
  );

  ipcMain.handle(
    "stock:receiveTransfer",
    (_event, input: ReceiveTransferInput): StockGenericResult => {
      if (!input?.userId || !input?.transferId) {
        return { ok: false, error: "Invalid transfer." };
      }
      return receiveTransfer(input);
    },
  );

  ipcMain.handle(
    "stock:cancelTransfer",
    (_event, payload: { userId: string; transferId: string }): StockGenericResult => {
      if (!payload?.userId || !payload?.transferId) {
        return { ok: false, error: "Invalid transfer." };
      }
      return cancelTransfer(payload.userId, payload.transferId);
    },
  );

  ipcMain.handle(
    "stock:findTransferByNumber",
    (_event, payload: { userId: string; transferNo: string }) => {
      if (!payload?.userId) {
        return { ok: false, error: "Login required." };
      }
      return findTransferByNumber(payload.userId, payload.transferNo);
    },
  );

  ipcMain.handle(
    "stock:loadTransferForReview",
    (_event, payload: { userId: string; transferId: string }) => {
      if (!payload?.userId || !payload?.transferId) {
        return { ok: false, error: "Invalid transfer." };
      }
      return loadTransferForReview(payload.userId, payload.transferId);
    },
  );

  ipcMain.handle(
    "stock:saveAdjustment",
    (_event, input: SaveAdjustmentInput): StockMutationResult => {
      if (!input?.userId) {
        return { ok: false, error: "Login required." };
      }
      return saveAdjustment(input);
    },
  );

  ipcMain.handle(
    "stock:postAdjustment",
    (_event, payload: { userId: string; adjustmentId: string }): StockGenericResult => {
      if (!payload?.userId || !payload?.adjustmentId) {
        return { ok: false, error: "Invalid adjustment." };
      }
      return postAdjustment(payload.userId, payload.adjustmentId);
    },
  );

  ipcMain.handle(
    "stock:cancelAdjustment",
    (_event, payload: { userId: string; adjustmentId: string }): StockGenericResult => {
      if (!payload?.userId || !payload?.adjustmentId) {
        return { ok: false, error: "Invalid adjustment." };
      }
      return cancelAdjustment(payload.userId, payload.adjustmentId);
    },
  );

  ipcMain.handle(
    "stock:findAdjustmentByNumber",
    (_event, payload: { userId: string; adjustmentNo: string }) => {
      if (!payload?.userId) {
        return { ok: false, error: "Login required." };
      }
      return findAdjustmentByNumber(payload.userId, payload.adjustmentNo);
    },
  );

  ipcMain.handle(
    "stock:loadAdjustmentForReview",
    (_event, payload: { userId: string; adjustmentId: string }) => {
      if (!payload?.userId || !payload?.adjustmentId) {
        return { ok: false, error: "Invalid adjustment." };
      }
      return loadAdjustmentForReview(payload.userId, payload.adjustmentId);
    },
  );
}
