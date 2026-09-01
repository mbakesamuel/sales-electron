import { getElectronApi } from "../auth/client.ts";
import { reportWatermarkBackgroundValue } from "./reportWatermarkAsset.ts";

function waitForPrintLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Save the current report window as PDF via Electron printToPDF + save dialog.
 */
export async function saveReportPdf(defaultFileName: string): Promise<void> {
  document.documentElement.style.setProperty(
    "--report-watermark-url",
    reportWatermarkBackgroundValue(),
  );
  document.body.classList.add("scr-print-mode", "scr-pdf-export");

  await waitForPrintLayout();

  try {
    const result = await getElectronApi().print.exportPdf(defaultFileName);
    if ("error" in result && typeof result.error === "string") {
      window.alert(result.error);
    }
  } finally {
    document.body.classList.remove("scr-print-mode", "scr-pdf-export");
    document.documentElement.style.removeProperty("--report-watermark-url");
  }
}
