import { ipcMain } from "electron";
import type {
  CarryForwardStockBatchResult,
  CarryForwardStockFormOptions,
  CarryForwardStockOnHandRow,
  CarryForwardStockPendingRow,
  CarryForwardStockRow,
  UpsertCarryForwardStockBatchInput,
} from "../../shared/carryForwardStock.types.js";
import {
  getCarryForwardStockFormOptions,
  listCarryForwardStock,
  listCarryForwardStockOnHand,
  listCarryForwardStockPending,
  upsertCarryForwardStockBatch,
} from "../stock/carryForwardStock.js";

export function registerCarryForwardStockHandlers(): void {
  ipcMain.handle(
    "carryForwardStock:getFormOptions",
    (): CarryForwardStockFormOptions => getCarryForwardStockFormOptions(),
  );

  ipcMain.handle(
    "carryForwardStock:list",
    (): CarryForwardStockRow[] => listCarryForwardStock(),
  );

  ipcMain.handle(
    "carryForwardStock:listPending",
    (_event, input: { userId: string }): CarryForwardStockPendingRow[] =>
      listCarryForwardStockPending(input.userId),
  );

  ipcMain.handle(
    "carryForwardStock:listOnHand",
    (
      _event,
      input: { salesPointId: number; productId: number },
    ): CarryForwardStockOnHandRow[] =>
      listCarryForwardStockOnHand(input.salesPointId, input.productId),
  );

  ipcMain.handle(
    "carryForwardStock:upsertBatch",
    (_event, input: UpsertCarryForwardStockBatchInput): CarryForwardStockBatchResult =>
      upsertCarryForwardStockBatch(input),
  );
}
