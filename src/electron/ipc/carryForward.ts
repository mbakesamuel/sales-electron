import { ipcMain } from "electron";
import type {
  CarryForwardBatchResult,
  CarryForwardCommitmentPendingRow,
  CarryForwardCommitmentRow,
  CarryForwardDeleteResult,
  CarryForwardFormOptions,
  CarryForwardMutationResult,
  DeleteCarryForwardInput,
  UpsertCarryForwardBatchInput,
  UpsertCarryForwardInput,
} from "../../shared/carryForward.types.js";
import {
  deleteCarryForwardCommitment,
  getCarryForwardFormOptions,
  listCarryForwardCommitments,
  listCarryForwardCommitmentsPending,
  upsertCarryForwardBatch,
  upsertCarryForwardCommitment,
} from "../commitments/carryForward.js";

export function registerCarryForwardHandlers(): void {
  ipcMain.handle(
    "carryForward:getFormOptions",
    (): CarryForwardFormOptions => getCarryForwardFormOptions(),
  );

  ipcMain.handle(
    "carryForward:list",
    (): CarryForwardCommitmentRow[] => listCarryForwardCommitments(),
  );

  ipcMain.handle(
    "carryForward:listPending",
    (_event, input: { userId: string }): CarryForwardCommitmentPendingRow[] =>
      listCarryForwardCommitmentsPending(input.userId),
  );

  ipcMain.handle(
    "carryForward:upsert",
    (_event, input: UpsertCarryForwardInput): CarryForwardMutationResult =>
      upsertCarryForwardCommitment(input),
  );

  ipcMain.handle(
    "carryForward:upsertBatch",
    (_event, input: UpsertCarryForwardBatchInput): CarryForwardBatchResult =>
      upsertCarryForwardBatch(input),
  );

  ipcMain.handle(
    "carryForward:delete",
    (_event, input: DeleteCarryForwardInput): CarryForwardDeleteResult =>
      deleteCarryForwardCommitment(input),
  );
}
