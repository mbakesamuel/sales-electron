import { getElectronApi } from "../auth/client.ts";

/**
 * Save the current report window as PDF via Electron printToPDF + save dialog.
 */
export async function saveReportPdf(defaultFileName: string): Promise<void> {
  const result = await getElectronApi().print.exportPdf(defaultFileName);
  if ("error" in result && typeof result.error === "string") {
    window.alert(result.error);
  }
}
