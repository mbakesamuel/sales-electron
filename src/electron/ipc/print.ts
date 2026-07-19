import { BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";

export type ExportPdfResult =
  | { ok: true; filePath: string }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled: false; error: string };

export function registerPrintHandlers(): void {
  ipcMain.handle(
    "print:exportPdf",
    async (event, defaultFileName?: string): Promise<ExportPdfResult> => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || win.isDestroyed()) {
        return { ok: false, cancelled: false, error: "No window available for PDF export." };
      }

      const suggestedName =
        typeof defaultFileName === "string" && defaultFileName.trim().length > 0
          ? defaultFileName.trim()
          : `weekly-print-pack-${new Date().toISOString().slice(0, 10)}.pdf`;

      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: "Save print pack PDF",
        defaultPath: suggestedName,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });

      if (canceled || !filePath) {
        return { ok: false, cancelled: true };
      }

      try {
        // A4 = 210mm × 297mm. Microns keep size exact across Electron/Chromium builds.
        // marginType "none" lets @page { margin } in CSS own the printable inset.
        const pdf = await win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: {
            width: 210000,
            height: 297000,
          },
          preferCSSPageSize: true,
          margins: {
            marginType: "none",
          },
        });
        await fs.writeFile(filePath, pdf);
        return { ok: true, filePath };
      } catch (error) {
        return {
          ok: false,
          cancelled: false,
          error: error instanceof Error ? error.message : "Failed to export PDF.",
        };
      }
    },
  );
}
