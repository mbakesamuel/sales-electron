import { useEffect, useState } from "preact/hooks";
import { getElectronApi } from "../auth/client.ts";
import type { SalePrintPayload } from "./types.ts";
import "./SalePrintView.css";

interface SalePrintViewProps {
  saleId: string;
  onClose: () => void;
}

function formatMoney(value: string): string {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    return value;
  }

  return Math.round(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function SalePrintView({ saleId, onClose }: SalePrintViewProps) {
  const [payload, setPayload] = useState<SalePrintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getElectronApi().sales.loadSalePrintById(saleId);
        if (!cancelled) {
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
  }, [saleId]);

  function handlePrint() {
    document.body.classList.add("sale-print-mode");
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("sale-print-mode");
      },
      { once: true },
    );
    window.print();
  }

  if (error) {
    return (
      <div class="sale-print-backdrop" onClick={onClose}>
        <div class="sale-print-modal" onClick={(event) => event.stopPropagation()}>
          <p class="sales-error">{error}</p>
          <button type="button" class="sales-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div class="sale-print-backdrop" onClick={onClose}>
        <div class="sale-print-modal" onClick={(event) => event.stopPropagation()}>
          <p class="sales-muted">Loading print view…</p>
        </div>
      </div>
    );
  }

  const { sale } = payload;

  return (
    <div class="sale-print-backdrop" onClick={onClose}>
      <div class="sale-print-modal" onClick={(event) => event.stopPropagation()}>
        <div class="sale-print-toolbar no-print">
          <button type="button" class="sales-btn-primary" onClick={handlePrint}>
            Print
          </button>
          <button type="button" class="sales-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <article class="sale-print-document">
          <header class="sale-print-header">
            <div>
              <h2>{payload.companyName}</h2>
              {payload.department ? <p>{payload.department}</p> : null}
              {payload.companyAddress ? <p>{payload.companyAddress}</p> : null}
              {payload.companyPhone ? <p>{payload.companyPhone}</p> : null}
            </div>
            <div class="sale-print-meta">
              <strong>{sale.invoiceNo}</strong>
              <span>{sale.status}</span>
              <span>Issued {sale.dateIssuedIso.slice(0, 10)}</span>
            </div>
          </header>

          <section class="sale-print-section">
            <p>
              <strong>Customer:</strong> {sale.customerName}
            </p>
            {sale.taxpayerId ? (
              <p>
                <strong>Taxpayer ID:</strong> {sale.taxpayerId}
              </p>
            ) : null}
            {sale.deliveryOrderNo ? (
              <p>
                <strong>Delivery order:</strong> {sale.deliveryOrderNo}
              </p>
            ) : null}
            {sale.referenceNumber ? (
              <p>
                <strong>Reference:</strong> {sale.referenceNumber}
              </p>
            ) : null}
            {sale.vehicleNumber && sale.vehicleNumber !== "BPO-OUTBOUND" ? (
              <p>
                <strong>Vehicle:</strong> {sale.vehicleNumber}
              </p>
            ) : null}
          </section>

          <table class="sale-print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((line) => (
                <tr key={line.lineNo}>
                  <td>{line.lineNo}</td>
                  <td>
                    {line.productName}
                    <span class="sale-print-cat"> ({line.productCat})</span>
                  </td>
                  <td>
                    {line.qty} {line.unitLabel}
                  </td>
                  <td>{formatMoney(line.unitPrice)}</td>
                  <td>{formatMoney(line.lineNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section class="sale-print-totals">
            <div>
              <span>Net</span>
              <span>{formatMoney(sale.netAmount)} XAF</span>
            </div>
            <div>
              <span>VAT</span>
              <span>{formatMoney(sale.vatAmount)} XAF</span>
            </div>
            <div class="sale-print-total">
              <span>Total</span>
              <span>{formatMoney(sale.grossAmount)} XAF</span>
            </div>
          </section>

          {sale.payments.length > 0 ? (
            <section class="sale-print-section">
              <h3>Payments</h3>
              <ul>
                {sale.payments.map((payment, index) => (
                  <li key={index}>
                    {payment.methodName}: {payment.amount}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      </div>
    </div>
  );
}
