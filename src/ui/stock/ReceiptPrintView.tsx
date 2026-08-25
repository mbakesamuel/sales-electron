import { useEffect, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { formatDisplayDate, formatDisplayDateTime } from "../../shared/formatDisplayDate.ts";
import type { ReceiptPrintPayload } from "../../shared/stock.types.ts";
import { getElectronApi } from "../auth/client.ts";
import { ReportFooter } from "../reports/ReportFooter.tsx";
import { ReportHeader } from "../reports/ReportHeader.tsx";
import { STOCK_DOC_STATUS_LABELS } from "./stockDisplay.ts";
import { formatDate, trimQty } from "./stockUtils.ts";
import "../delivery-orders/DeliveryOrderPrintView.css";
import "./ReceiptPrintView.css";

interface ReceiptPrintViewProps {
  receiptId: string;
  userId: string;
  onClose: () => void;
}

function handlePrint(): void {
  const style = document.createElement("style");
  style.id = "sr-print-portrait-style";
  style.textContent =
    "@media print { @page { size: A4 portrait; margin: 8mm; } }";
  document.head.appendChild(style);

  document.body.classList.add("sr-print-mode");
  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("sr-print-mode");
      style.remove();
    },
    { once: true },
  );
  window.print();
}

export function ReceiptPrintView({
  receiptId,
  userId,
  onClose,
}: ReceiptPrintViewProps) {
  const [payload, setPayload] = useState<ReceiptPrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getElectronApi().stock.loadReceiptPrintById({
          userId,
          receiptId,
        });
        if (!cancelled) {
          if (!data) {
            setError("Receipt not found.");
            return;
          }
          setPayload(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load print view.",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [receiptId, userId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  let content: preact.JSX.Element;

  if (error) {
    content = (
      <div class="do-print-backdrop sr-print-backdrop" onClick={onClose}>
        <div
          class="do-print-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <p class="sales-error">{error}</p>
          <button type="button" class="sales-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  } else if (!payload) {
    content = (
      <div class="do-print-backdrop sr-print-backdrop" onClick={onClose}>
        <div
          class="do-print-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <p class="sales-muted">Loading print view…</p>
        </div>
      </div>
    );
  } else {
    const { receipt } = payload;

    content = (
    <div class="do-print-backdrop sr-print-backdrop" onClick={onClose}>
      <div class="do-print-modal" onClick={(event) => event.stopPropagation()}>
        <div class="do-print-toolbar no-print">
          <button type="button" class="sales-btn-primary" onClick={handlePrint}>
            Print
          </button>
          <button type="button" class="sales-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <article class="do-print-document sr-print-document">
          <ReportHeader
            companyName={payload.companyName}
            department={payload.department}
            serviceName={payload.serviceName}
            title="Stock receipt"
          />

          <section class="do-print-meta-grid">
            <div class="do-print-meta-col">
              <p>
                <span class="do-print-label">Receipt #:</span>{" "}
                <strong>{receipt.receiptNo}</strong>
              </p>
              <p>
                <span class="do-print-label">Receipt date:</span>{" "}
                {formatDisplayDate(receipt.receivedAtIso)}
              </p>
              <p>
                <span class="do-print-label">Status:</span>{" "}
                {STOCK_DOC_STATUS_LABELS[receipt.status]}
              </p>
            </div>
            <div class="do-print-meta-col">
              <p>
                <span class="do-print-label">Collection point:</span>{" "}
                <strong>{receipt.salesPointName}</strong>
              </p>
              <p>
                <span class="do-print-label">Mill:</span> {receipt.supplierLabel}
              </p>
              <p>
                <span class="do-print-label">Total quantity:</span>{" "}
                {trimQty(receipt.totalQty)}
              </p>
            </div>
          </section>

          <section class="do-print-meta-grid sr-print-audit-grid">
            <div class="do-print-meta-col">
              <p>
                <span class="do-print-label">Drafted by:</span>{" "}
                {receipt.createdByName}
              </p>
              <p class="do-print-muted">
                {formatDisplayDateTime(receipt.createdAtIso)}
              </p>
            </div>
            {receipt.postedByName ? (
              <div class="do-print-meta-col">
                <p>
                  <span class="do-print-label">Posted by:</span>{" "}
                  {receipt.postedByName}
                </p>
                <p class="do-print-muted">
                  {formatDisplayDateTime(receipt.postedAtIso)}
                </p>
              </div>
            ) : (
              <div class="do-print-meta-col" />
            )}
          </section>

          {receipt.notes ? (
            <section class="sr-print-notes">
              <p>
                <span class="do-print-label">Notes:</span> {receipt.notes}
              </p>
            </section>
          ) : null}

          <table class="do-print-table sr-print-table">
            <colgroup>
              <col class="sr-print-col-item" />
              <col />
              <col />
              <col class="sr-print-col-uom" />
              <col class="sr-print-col-qty" />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Location</th>
                <th class="do-print-num">UOM</th>
                <th class="do-print-num">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line, index) => (
                <tr key={line.id}>
                  <td>{index + 1}</td>
                  <td>{line.productName}</td>
                  <td>{line.storageLocationName}</td>
                  <td class="do-print-num">{line.uom}</td>
                  <td class="do-print-num">{trimQty(line.qty)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} class="do-print-num do-print-label">
                  Total
                </td>
                <td class="do-print-num do-print-label">
                  {trimQty(receipt.totalQty)}
                </td>
              </tr>
            </tfoot>
          </table>

          <p class="sr-print-generated">
            Printed {formatDate(new Date().toISOString())}
          </p>

          <ReportFooter
            label={payload.signatoryTitle}
            name={payload.signatoryName}
          />
        </article>
      </div>
    </div>
    );
  }

  return createPortal(content, document.body);
}
