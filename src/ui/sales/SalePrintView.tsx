import { useEffect, useState } from "preact/hooks";
import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import { buildSaleInvoiceQrText } from "../../shared/saleInvoiceQr.ts";
import { getElectronApi } from "../auth/client.ts";
import { QrCode } from "../components/QrCode.tsx";
import { ReportHeader } from "../reports/ReportHeader.tsx";
import { ReportFooter } from "../reports/ReportFooter.tsx";
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
          if (!data) {
            setError("Sale not found.");
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
  }, [saleId]);

  function handlePrint() {
    const style = document.createElement("style");
    style.id = "sale-print-portrait-style";
    style.textContent =
      "@media print { @page { size: A4 portrait; margin: 8mm; } }";
    document.head.appendChild(style);

    document.body.classList.add("sale-print-mode");
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("sale-print-mode");
        style.remove();
      },
      { once: true },
    );
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

  if (!payload) {
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

  const { sale } = payload;
  const isBottleMode = sale.saleProductMode === "BOTTLE";
  const isSpecialDisposition =
    sale.saleDisposition === "RATION" ||
    sale.saleDisposition === "PUBLIC_RELATION";
  const skipTax = isBottleMode || isSpecialDisposition;
  const showTaxes = !skipTax && sale.appliedTaxes.length > 0;
  const paymentMethods = sale.payments
    .map((payment) => payment.methodName)
    .filter(Boolean);
  const paymentMethodLabel =
    paymentMethods.length > 0
      ? [...new Set(paymentMethods)].join(", ")
      : "—";
  const firstPaymentDate = sale.payments.find(
    (payment) => payment.paymentDate,
  )?.paymentDate;

  return (
    <div class="sale-print-backdrop" onClick={onClose}>
      <div
        class="sale-print-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div class="sale-print-toolbar no-print">
          <button type="button" class="sales-btn-primary" onClick={handlePrint}>
            Print
          </button>
          <button type="button" class="sales-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>

        <article class="sale-print-document">
          <ReportHeader
            companyName={payload.companyName}
            department={payload.department}
            serviceName={payload.serviceName}
            title="SALES INVOICE"
            meta={
              <QrCode
                value={buildSaleInvoiceQrText(sale, payload.companyName)}
                size={96}
                alt="Invoice verification QR code"
              />
            }
          />

          <section class="sale-print-meta-grid">
            <div class="sale-print-meta-col">
              <p>
                <span class="sale-print-label">Invoice No:</span>{" "}
                <strong>{sale.invoiceNo}</strong>
              </p>
              <p>
                <span class="sale-print-label">Invoice Date:</span>{" "}
                {formatDisplayDate(sale.dateIssuedIso)}
              </p>
              {sale.deliveryOrderNo ? (
                <p>
                  <span class="sale-print-label">Delivery Order:</span>{" "}
                  {sale.deliveryOrderNo}
                </p>
              ) : null}
              {sale.referenceNumber ? (
                <p>
                  <span class="sale-print-label">Reference:</span>{" "}
                  {sale.referenceNumber}
                </p>
              ) : null}
            </div>
            <div class="sale-print-meta-col">
              <p>
                <span class="sale-print-label">Customer:</span>{" "}
                <strong>{sale.customerName}</strong>
              </p>
              <p>
                <span class="sale-print-label">Salesperson:</span>{" "}
                {sale.salespersonName?.trim() || "—"}
              </p>
              {sale.taxpayerId ? (
                <p>
                  <span class="sale-print-label">Taxpayer ID:</span>{" "}
                  {sale.taxpayerId}
                </p>
              ) : null}
              {sale.vehicleNumber && sale.vehicleNumber !== "BPO-OUTBOUND" ? (
                <p>
                  <span class="sale-print-label">Vehicle:</span>{" "}
                  {sale.vehicleNumber}
                </p>
              ) : null}
            </div>
          </section>

          <section class="sale-print-info-grid">
            <div class="sale-print-info-block">
              <div class="sale-print-info-heading">Billing Address:</div>
              <div class="sale-print-info-body">
                <p>{sale.customerName}</p>
                {sale.customerAddress ? (
                  <p>{sale.customerAddress}</p>
                ) : (
                  <p class="sale-print-muted">No address on file</p>
                )}
                {sale.customerPhone ? <p>{sale.customerPhone}</p> : null}
              </div>
            </div>
            <div class="sale-print-info-block">
              <div class="sale-print-info-heading">Shipping Address:</div>
              <div class="sale-print-info-body">
                {sale.salesPointName ? (
                  <>
                    <p>{sale.salesPointName}</p>
                    <p class="sale-print-muted">Collection / sales point</p>
                  </>
                ) : (
                  <p>Same as billing</p>
                )}
              </div>
            </div>
          </section>

          <table class="sale-print-table">
            <colgroup>
              <col class="sale-print-col-code" />
              <col class="sale-print-col-desc" />
              <col class="sale-print-col-qty" />
              <col class="sale-print-col-price" />
              <col class="sale-print-col-total" />
            </colgroup>
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Description</th>
                <th class="sale-print-num">Quantity</th>
                <th class="sale-print-num">Unit Price</th>
                <th class="sale-print-num">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((line) => (
                <tr key={line.lineNo}>
                  <td>{line.productCode?.trim() || "—"}</td>
                  <td>
                    {line.productName}
                    {line.productCat ? (
                      <span class="sale-print-cat"> ({line.productCat})</span>
                    ) : null}
                  </td>
                  <td class="sale-print-num">
                    {line.qty} {line.unitLabel}
                  </td>
                  <td class="sale-print-num">
                    {formatMoney(line.unitPrice)} XAF
                  </td>
                  <td class="sale-print-num">
                    {formatMoney(line.lineNet)} XAF
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <section class="sale-print-bottom">
            <div class="sale-print-payment-block">
              <p>
                <span class="sale-print-label">Payment Method:</span>{" "}
                {paymentMethodLabel}
              </p>
              <p>
                <span class="sale-print-label">Payment Date:</span>{" "}
                {firstPaymentDate
                  ? formatDisplayDate(firstPaymentDate)
                  : formatDisplayDate(sale.dateIssuedIso)}
              </p>
              <p>
                <span class="sale-print-label">Status:</span> {sale.status}
              </p>
              {sale.payments.length > 1 ? (
                <ul class="sale-print-payment-list">
                  {sale.payments.map((payment, index) => (
                    <li key={index}>
                      {payment.methodName}: {payment.amount || "0 XAF"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div class="sale-print-totals">
              <div>
                <span>
                  {isBottleMode ? "Total (tax inclusive)" : "Subtotal"}
                </span>
                <span>{formatMoney(sale.netAmount)} XAF</span>
              </div>
              {showTaxes
                ? sale.appliedTaxes.map((tax) => (
                    <div key={`${tax.label}:${tax.ratePercent}`}>
                      <span>
                        {tax.label}
                        {tax.ratePercent ? ` (${tax.ratePercent})` : ""}
                      </span>
                      <span>{tax.amount || `${formatMoney("0")} XAF`}</span>
                    </div>
                  ))
                : null}
              {!skipTax && !showTaxes && Number.parseFloat(sale.vatAmount) > 0 ? (
                <div>
                  <span>VAT</span>
                  <span>{formatMoney(sale.vatAmount)} XAF</span>
                </div>
              ) : null}
              <div class="sale-print-grand-total">
                <span>Grand Total:</span>
                <span>{formatMoney(sale.grossAmount)} XAF</span>
              </div>
            </div>
          </section>

        {/*   <section class="sale-print-notes">
            <p>
              <span class="sale-print-label">Notes:</span> Thank you for your
              business.
              {sale.saleDisposition && sale.saleDisposition !== "NORMAL"
                ? ` Disposition: ${sale.saleDisposition.replaceAll("_", " ")}.`
                : ""}
            </p>
          </section> */}

          <section class="sale-print-signatures">
            <ReportFooter
              name={payload.signatoryName}
              label={payload.signatoryTitle}
            />
          </section>
        </article>
      </div>
    </div>
  );
}
