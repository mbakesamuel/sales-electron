import { formatDisplayDate } from "../../shared/formatDisplayDate.ts";
import type { ConsignmentPrintPayload } from "../../shared/vehicleConsignmentNotes.types.ts";
import "./VcnPrintProductsTable.css";

function lineQuantity(line: ConsignmentPrintPayload["sale"]["saleLines"][0]): string {
  const units = line.qtyUnits?.trim();
  if (units) {
    return units;
  }
  const kg = Number.parseFloat(line.qtyKg);
  if (Number.isFinite(kg) && kg > 0) {
    return line.qtyKg;
  }
  return "—";
}

function sumQuantities(lines: ConsignmentPrintPayload["sale"]["saleLines"]): number {
  return lines.reduce((sum, line) => {
    const units = line.qtyUnits?.trim();
    if (units) {
      const n = Number.parseFloat(units);
      return sum + (Number.isFinite(n) ? n : 0);
    }
    const kg = Number.parseFloat(line.qtyKg);
    return sum + (Number.isFinite(kg) ? kg : 0);
  }, 0);
}

/*
function dispositionSubtitle(disposition: SaleDisposition | null): string | null {
  if (disposition === "RATION") {
    return "Ration";
  }
  if (disposition === "PUBLIC_RELATION") {
    return "Public relation";
  }
  return null;
}
*/

interface VcnPrintProductsTableProps {
  payload: ConsignmentPrintPayload;
}

export function VcnPrintProductsTable({ payload }: VcnPrintProductsTableProps) {
  const { note, sale, companyName } = payload;
 /*  const subtitle = dispositionSubtitle(sale.saleDisposition); */
  const totalQty = sumQuantities(sale.saleLines);

  return (
    <article class="sale-print-document vcn-products-document">
      <header class="vcn-products-header">
        <div class="vcn-products-company">{companyName ?? "—"}</div>
        <h1>VEHICLE CONSIGNMENT NOTE</h1>
      {/*   {subtitle ? <p class="vcn-products-subtitle">{subtitle}</p> : null} */}
      </header>

      <section class="vcn-products-meta">
        <div class="vcn-products-meta-row">
          <span>
            <strong>FROM:</strong> {sale.salesPointName ?? "—"}
          </span>
          <span>
            <strong>TO:</strong> {note.destination}
          </span>
        </div>
        <div class="vcn-products-meta-row">
          <span>
            <strong>VEHICLE NO:</strong> {note.vehicleNumber}
          </span>
          <span>
            <strong>DATE:</strong> {formatDisplayDate(note.dateOfConsignment)}
          </span>
        </div>
      </section>

      <h2 class="vcn-products-table-title">PRODUCTS</h2>
      <table class="vcn-products-table">
        <thead>
          <tr>
            <th>SN</th>
            <th>PRODUCT DESCRIPTION</th>
            <th>QUANTITY</th>
            <th>REMARKS</th>
          </tr>
        </thead>
        <tbody>
          {sale.saleLines.length === 0 ? (
            <tr>
              <td>1</td>
              <td>—</td>
              <td>—</td>
              <td>{sale.invoiceNo}</td>
            </tr>
          ) : (
            sale.saleLines.map((line, index) => (
              <tr key={`${line.productName}-${index}`}>
                <td>{index + 1}</td>
                <td>{line.productName}</td>
                <td>{lineQuantity(line)}</td>
                <td>{index === 0 ? sale.invoiceNo : ""}</td>
              </tr>
            ))
          )}
          <tr class="vcn-products-total-row">
            <td colSpan={2}>
              <strong>TOTAL</strong>
            </td>
            <td>
              <strong>{totalQty > 0 ? String(totalQty) : "0"}</strong>
            </td>
            <td />
          </tr>
        </tbody>
      </table>

      <section class="vcn-products-signatories">
        <div class="vcn-products-sign-col">
          <p>
            <strong>Consigned By:</strong> {note.consignerName}
          </p>
          <p>
            <strong>Designation:</strong> {note.consignerDesignation}
          </p>
          <p class="vcn-products-signature-line">Signature</p>
          <p>
            <strong>Date:</strong> {formatDisplayDate(note.dateOfConsignment)}
          </p>
        </div>
        <div class="vcn-products-sign-col">
          <p>
            <strong>Received By:</strong> {note.receiverName}
          </p>
          <p>
            <strong>Designation:</strong>
          </p>
          <p class="vcn-products-signature-line">Signature</p>
          <p>
            <strong>Date:</strong>{" "}
            {note.receivedDate
              ? formatDisplayDate(note.receivedDate)
              : formatDisplayDate(note.dateOfConsignment)}
          </p>
        </div>
      </section>

      <footer class="vcn-products-footer">
        <p>
          Consigner must arrange for own checker and conductor to agree and sign
          for goods on each vehicle.
        </p>
        <p>
          Three copies to be handled to consigner for signature by consignee on
          receipt delivery.
        </p>
      </footer>

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
