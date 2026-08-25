import type { TransferPrintPayload } from "../../shared/stock.types.js";
import { loadReportCompanySettings } from "../reports/companySettings.js";
import { loadTransferDetail } from "./service.js";

export function loadTransferPrintById(
  userId: string,
  transferId: string,
): TransferPrintPayload | null {
  const transfer = loadTransferDetail(transferId, userId);
  if (!transfer) {
    return null;
  }

  const asAtIso =
    transfer.dispatchedAtIso ??
    transfer.receivedAtIso ??
    transfer.createdAtIso.slice(0, 10);
  const settings = loadReportCompanySettings(userId, asAtIso);

  return {
    companyName: settings.companyName,
    department: settings.department,
    serviceName: settings.serviceName,
    signatoryName: settings.signatoryName,
    signatoryTitle: settings.signatoryTitle,
    transfer,
  };
}
