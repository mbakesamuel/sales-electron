import { useEffect, useState } from "preact/hooks";
import { layoutForDisposition } from "../../shared/consignmentNoteLayout.ts";
import type { ConsignmentPrintPayload } from "../../shared/vehicleConsignmentNotes.types.ts";
import { getElectronApi } from "../auth/client.ts";
import { VcnPrintBordereau } from "./VcnPrintBordereau.tsx";
import { VcnPrintProductsTable } from "./VcnPrintProductsTable.tsx";
import "./VcnPrintView.css";

interface ConsignmentNotePrintViewProps {
  noteId: string;
  onClose: () => void;
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

  function onPrint() {
    window.print();
  }

  if (error) {
    return (
      <div class="sale-print-backdrop" onClick={onClose}>
        <div
          class="sale-print-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <p class="sales-error">{error}</p>
          <button type="button" class="sales-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (loading || !payload) {
    return (
      <div class="sale-print-backdrop" onClick={onClose}>
        <div
          class="sale-print-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <p class="sales-muted">Loading print view…</p>
        </div>
      </div>
    );
  }

  const layout = layoutForDisposition(payload.sale.saleDisposition);

  return (
    <div class="sale-print-backdrop" onClick={onClose}>
      <div
        class="sale-print-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div class="sale-print-toolbar no-print">
          <button type="button" class="sales-btn-primary" onClick={onPrint}>
            Print
          </button>
          <button type="button" class="sales-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {layout === "bordereau" ? (
          <VcnPrintBordereau payload={payload} />
        ) : (
          <VcnPrintProductsTable payload={payload} />
        )}
      </div>
    </div>
  );
}
