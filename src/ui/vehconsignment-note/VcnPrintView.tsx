import { useEffect, useState } from "preact/hooks";
import {
  layoutForDisposition,
  type ConsignmentNoteLayout,
} from "../../shared/consignmentNoteLayout.ts";
import type { ConsignmentPrintPayload } from "../../shared/vehicleConsignmentNotes.types.ts";
import { getElectronApi } from "../auth/client.ts";
import { ReportOverlayShell } from "../reports/ReportOverlayShell.tsx";
import {
  DocumentStatusStamp,
  draftStampLabel,
} from "../print/DocumentStatusStamp.tsx";
import { VcnPrintBordereau } from "./VcnPrintBordereau.tsx";
import { VcnPrintProductsTable } from "./VcnPrintProductsTable.tsx";
import "../reports/StockCommitmentReport.css";
import "./VcnPrintView.css";

const COPY_LABELS = ["Original", "Duplicate"] as const;

interface ConsignmentNotePrintViewProps {
  noteId: string;
  onClose: () => void;
}

function handlePrint(): void {
  document.body.classList.add("vcn-print-mode");
  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("vcn-print-mode");
    },
    { once: true },
  );
  window.print();
}

function VcnPrintDualSheet({
  payload,
  layout,
}: {
  payload: ConsignmentPrintPayload;
  layout: ConsignmentNoteLayout;
}) {
  const Document =
    layout === "bordereau" ? VcnPrintBordereau : VcnPrintProductsTable;
  const statusStamp = draftStampLabel(payload.note.status);

  return (
    <div class="vcn-print-sheet">
      {COPY_LABELS.map((label) => (
        <section
          class="vcn-print-copy"
          key={label}
          aria-label={`${label} copy`}
        >
          <div class="vcn-print-stamp">{label}</div>
          <DocumentStatusStamp label={statusStamp} />
          <div class="vcn-print-copy-body">
            <Document payload={payload} />
          </div>
        </section>
      ))}
    </div>
  );
}

export function ConsignmentNotePrintView({
  noteId,
  onClose,
}: ConsignmentNotePrintViewProps) {
  const [payload, setPayload] = useState<ConsignmentPrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getElectronApi()
      .vehicleConsignmentNotes.loadPrintById(noteId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError("Consignment note not found.");
          setPayload(null);
        } else {
          setPayload(data);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load print view.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  return (
    <ReportOverlayShell reportId="vehicle-consignment-notes" onClose={onClose}>
      {error ? (
        <p class="scr-status scr-status-error">{error}</p>
      ) : loading || !payload ? (
        <p class="scr-status">Loading print view…</p>
      ) : (
        <div class="scr-page vcn-print-page">
          <div class="scr-toolbar no-print">
            <button type="button" class="scr-btn" onClick={handlePrint}>
              Print
            </button>
          </div>
          <VcnPrintDualSheet
            payload={payload}
            layout={layoutForDisposition(payload.sale.saleDisposition)}
          />
        </div>
      )}
    </ReportOverlayShell>
  );
}
