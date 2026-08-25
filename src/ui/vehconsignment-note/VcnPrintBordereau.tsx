import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { ConsignmentPrintPayload } from "../../shared/vehicleConsignmentNotes.types.ts";
import { ReportHeader } from "../reports/ReportHeader.tsx";
import "./VcnPrintBordereau.css";

function parseQty(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQtyKg(value: string): string {
  const n = parseQty(value);
  if (n <= 0) {
    return "—";
  }
  return `${value} kg`;
}

function previousBalanceKg(
  doContext: ConsignmentPrintPayload["doContext"],
  thisSaleLiftedQtyKg: string,
): string {
  const balance = parseQty(doContext.balanceQtyKg);
  const lifted = parseQty(thisSaleLiftedQtyKg);
  if (doContext.balanceQtyKg === "—") {
    return "—";
  }
  return String(balance + lifted);
}

function primaryDesignation(payload: ConsignmentPrintPayload): string {
  const names = payload.sale.saleLines
    .map((line) => line.productName.trim())
    .filter(Boolean);
  if (names.length === 0) {
    return "—";
  }
  return [...new Set(names)].join(", ");
}

interface VcnPrintBordereauProps {
  payload: ConsignmentPrintPayload;
}

export function VcnPrintBordereau({ payload }: VcnPrintBordereauProps) {
  const { note, sale, doContext, companyName, department, liftedQtyInWords } =
    payload;

  return (
    <article class="sale-print-document vcn-bordereau-document">
      <ReportHeader
        companyName={companyName ?? "—"}
        department={department}
        serviceName={null}
        title="VEHICLE CONSIGNMENT NOTE / Bordereau de Livraison"
        meta={
          <p class="vcn-bordereau-serial">
            No. <strong>{note.consignmentNoteNo}</strong>
          </p>
        }
      />

      <section class="vcn-bordereau-meta">
        <div class="vcn-bordereau-meta-row">
          <span>
            <span class="vcn-bordereau-label">From/de:</span>{" "}
            {sale.salesPointName ?? "—"}
          </span>
          <span>
            <span class="vcn-bordereau-label">To/a:</span> {note.destination}
          </span>
        </div>
        <div class="vcn-bordereau-meta-row">
          <span>
            <span class="vcn-bordereau-label">Vehicle No.:</span>{" "}
            {note.vehicleNumber}
          </span>
          <span>
            <span class="vcn-bordereau-label">Date:</span>{" "}
            {formatDisplayDate(note.dateOfConsignment)}
          </span>
        </div>
      </section>

      <table class="vcn-bordereau-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Designation</th>
            <th>Quantity / Quantité</th>
            <th>Unit / Unité</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td />
            <td>{primaryDesignation(payload)}</td>
            <td>{formatQtyKg(sale.thisSaleLiftedQtyKg)}</td>
            <td>kg</td>
          </tr>
          <tr>
            <td colSpan={2}>
              Previous Balance / Reliquant Précédent
            </td>
            <td colSpan={2}>
              {formatQtyKg(previousBalanceKg(doContext, sale.thisSaleLiftedQtyKg))}
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              D.O. No. {sale.deliveryOrderNo ?? "—"}
            </td>
            <td colSpan={2}>
              Date{" "}
              {doContext.deliveryOrderDate
                ? formatDisplayDate(doContext.deliveryOrderDate)
                : "—"}
            </td>
          </tr>
          <tr>
            <td colSpan={2}>Paid for / Achat</td>
            <td colSpan={2}>
              {doContext.paidQtyKg === "—"
                ? "—"
                : `${doContext.paidQtyKg} kg`}
            </td>
          </tr>
          <tr>
            <td colSpan={2}>Lifted Charge / Chargé (*)</td>
            <td colSpan={2}>{formatQtyKg(sale.thisSaleLiftedQtyKg)}</td>
          </tr>
          <tr>
            <td colSpan={2}>Others / Autres</td>
            <td colSpan={2}>—</td>
          </tr>
          <tr>
            <td colSpan={2}>Balance / Reliquant</td>
            <td colSpan={2}>
              {doContext.balanceQtyKg === "—"
                ? "—"
                : `${doContext.balanceQtyKg} kg`}
            </td>
          </tr>
        </tbody>
      </table>

      <p class="vcn-bordereau-in-words">
        (*) in words / En lettres:{" "}
        <strong>{liftedQtyInWords ?? "—"}</strong>
      </p>

      <section class="vcn-bordereau-signatories">
        <div class="vcn-bordereau-sign-col">
          <h3>Consigned by / Chargeur</h3>
          <p>
            <span class="vcn-bordereau-label">Name/Nom:</span>{" "}
            {note.consignerName}
          </p>
          <p>
            <span class="vcn-bordereau-label">Designation/Qualité:</span>{" "}
            {note.consignerDesignation}
          </p>
          <p class="vcn-bordereau-signature-line">Signature</p>
          <p>
            <span class="vcn-bordereau-label">Date:</span>{" "}
            {formatDisplayDate(note.dateOfConsignment)}
          </p>
        </div>
        <div class="vcn-bordereau-sign-col">
          <h3>Received by / Client</h3>
          <p>
            <span class="vcn-bordereau-label">Name/Nom:</span>{" "}
            {note.receiverName}
          </p>
          <p>
            <span class="vcn-bordereau-label">N° I.C./C.I.N.:</span>{" "}
            {note.receiverNicNo}
            {note.receiverNicPlaceOfIssue
              ? ` At/A: ${note.receiverNicPlaceOfIssue}`
              : ""}
          </p>
          <p class="vcn-bordereau-signature-line">Signature</p>
          <p>
            <span class="vcn-bordereau-label">Date:</span>{" "}
            {note.receivedDate
              ? formatDisplayDate(note.receivedDate)
              : formatDisplayDate(note.dateOfConsignment)}
          </p>
        </div>
      </section>

      <p class="vcn-bordereau-footer">
        The signatory (RECEIVER) is acting for and on behalf of the Customer /
        Le Signataire (RECEPTIONNAIRE) agit pour le compte du client.
      </p>

      {note.status === "VALIDATED" ? (
        <p class="vcn-print-validated">
          Validated by {note.validatedByName ?? "—"}
          {note.validatedAtIso
            ? ` on ${formatDisplayDate(note.validatedAtIso.slice(0, 10))}`
            : ""}
        </p>
      ) : null}
    </article>
  );
}
