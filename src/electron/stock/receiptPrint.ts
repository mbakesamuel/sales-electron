import type { ReceiptPrintPayload } from "../../shared/stock.types.js";
import { loadReportCompanySettings } from "../reports/companySettings.js";
import { loadReceiptDetail } from "./service.js";

export function loadReceiptPrintById(
  userId: string,
  receiptId: string,
): ReceiptPrintPayload | null {
  const receipt = loadReceiptDetail(receiptId, userId);
  if (!receipt) {
    return null;
  }

  const settings = loadReportCompanySettings(userId, receipt.receivedAtIso);

  return {
    companyName: settings.companyName,
    department: settings.department,
    serviceName: settings.serviceName,
    signatoryName: settings.signatoryName,
    signatoryTitle: settings.signatoryTitle,
    receipt,
  };
}
