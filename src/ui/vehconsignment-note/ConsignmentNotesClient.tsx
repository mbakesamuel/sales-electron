import { useState } from "preact/hooks";
import type { AuthUser } from "../auth/session.ts";
import type { RolePermissionsSnapshot } from "../../shared/permissions.types.ts";
import {
  canPerformActionFromSnapshot,
  canWriteRouteFromSnapshot,
} from "../../shared/permissionUtils.ts";
import type {
  ConsignmentNoteStatus,
  ConsignmentSaleLine,
  LoadedConsignmentFormView,
} from "../../shared/vehicleConsignmentNotes.types.ts";
import type { SaleDisposition } from "../../shared/sales.types.ts";
import {
  consignmentFormHint,
  consignmentFormTitle,
  layoutForDisposition,
} from "../../shared/consignmentNoteLayout.ts";
import { getElectronApi } from "../auth/client.ts";
import { ConsignmentNotePrintView } from "./VcnPrintView.tsx";
import "./VcnPrintView.css";
import "../sales/sales.css";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ConsignmentNotesClientProps {
  user: AuthUser;
  permissions: RolePermissionsSnapshot;
}

export function ConsignmentNotesClient({
  user,
  permissions,
}: ConsignmentNotesClientProps) {
  const api = getElectronApi();

  const [saleId, setSaleId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [consignmentNoteNo, setConsignmentNoteNo] = useState("");
  const [invoiceLookup, setInvoiceLookup] = useState("");
  const [vcnLookup, setVcnLookup] = useState("");

  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleStatus, setSaleStatus] = useState<ConsignmentNoteStatus | null>(
    null,
  );
  const [fromName, setFromName] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [paidQty, setPaidQty] = useState("");
  const [liftedQty, setLiftedQty] = useState("");
  const [balanceQty, setBalanceQty] = useState("");
  const [doNo, setDoNo] = useState<string | null>(null);
  const [thisSaleLifted, setThisSaleLifted] = useState("");
  const [saleDisposition, setSaleDisposition] =
    useState<SaleDisposition | null>(null);
  const [saleLines, setSaleLines] = useState<ConsignmentSaleLine[]>([]);

  const [destination, setDestination] = useState("");
  const [dateOfLifting, setDateOfLifting] = useState(todayIsoDate());
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [consignerName, setConsignerName] = useState("");
  const [consignerDesignation, setConsignerDesignation] = useState("");
  const [dateOfConsignment, setDateOfConsignment] = useState(todayIsoDate());
  const [receiverName, setReceiverName] = useState("");
  const [receiverNicNo, setReceiverNicNo] = useState("");
  const [receiverNicPlaceOfIssue, setReceiverNicPlaceOfIssue] = useState("");
  const [receivedDate, setReceivedDate] = useState("");

  const [noteStatus, setNoteStatus] = useState<ConsignmentNoteStatus | null>(
    null,
  );
  const [validatedByName, setValidatedByName] = useState("");
  const [validatedAtIso, setValidatedAtIso] = useState("");

  const [banner, setBanner] = useState<{
    type: "error" | "ok";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [printNoteId, setPrintNoteId] = useState<string | null>(null);

  const canDraft = canWriteRouteFromSnapshot(
    permissions,
    "vehicle-consignment-notes",
  );
  const canValidate = canPerformActionFromSnapshot(
    permissions,
    "validate_vehicle_consignment_notes",
  );

  function applyLoaded(data: LoadedConsignmentFormView) {
    const { sale, note, doContext } = data;
    setSaleId(sale.id);
    setInvoiceNo(sale.invoiceNo);
    setSaleStatus(sale.status);
    setFromName(sale.salesPointName ?? "—");
    setCustomerName(sale.customerName);
    setDoNo(sale.deliveryOrderNo);
    setThisSaleLifted(sale.thisSaleLiftedQtyKg);
    setPaidQty(doContext.paidQtyKg);
    setLiftedQty(doContext.liftedQtyKg);
    setBalanceQty(doContext.balanceQtyKg);
    setSaleDisposition(sale.saleDisposition);
    setSaleLines(sale.saleLines);

    if (note) {
      setNoteId(note.id);
      setConsignmentNoteNo(note.consignmentNoteNo);
      setDestination(note.destination);
      setDateOfLifting(note.dateOfLifting);
      setVehicleNumber(note.vehicleNumber);
      setConsignerName(note.consignerName);
      setConsignerDesignation(note.consignerDesignation);
      setDateOfConsignment(note.dateOfConsignment);
      setReceiverName(note.receiverName);
      setReceiverNicNo(note.receiverNicNo);
      setReceiverNicPlaceOfIssue(note.receiverNicPlaceOfIssue);
      setReceivedDate(note.receivedDate ?? "");
      setNoteStatus(note.status);
      setValidatedByName(note.validatedByName ?? "");
      setValidatedAtIso(note.validatedAtIso ?? "");
    } else {
      setNoteId(null);
      setConsignmentNoteNo("");
      setDestination(sale.customerAddress?.trim() || "");
      setDateOfLifting(sale.soldAtIso.slice(0, 10));
      setVehicleNumber(sale.vehicleNumber);
      setConsignerName("");
      setConsignerDesignation("");
      setDateOfConsignment(todayIsoDate());
      setReceiverName("");
      setReceiverNicNo("");
      setReceiverNicPlaceOfIssue("");
      setReceivedDate("");
      setNoteStatus(null);
      setValidatedByName("");
      setValidatedAtIso("");
    }
    setBanner(null);
  }

  async function onLoadByInvoice() {
    setBusy("inv");
    setBanner(null);
    try {
      const result =
        await api.vehicleConsignmentNotes.loadSaleByInvoice(invoiceLookup);
      if (!result.ok) {
        setBanner({
          type: "error",
          text: result.error,
        });
        return;
      }
      applyLoaded(result.data);
      setBanner({
        type: "ok",
        text: `Loaded sale ${result.data.sale.invoiceNo}.`,
      });
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load sale.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function onLoadByVcn() {
    setBusy("vcn");
    setBanner(null);
    try {
      const data = await api.vehicleConsignmentNotes.loadByVcnNo(vcnLookup);
      if (!data) {
        setBanner({
          type: "error",
          text: "No consignment note matches that VCN number.",
        });
        return;
      }
      applyLoaded(data);
      setVcnLookup(data.note?.consignmentNoteNo ?? vcnLookup);
      setBanner({
        type: "ok",
        text: `Loaded ${data.note?.consignmentNoteNo ?? "note"}.`,
      });
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load note.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function onSave() {
    if (!saleId) return;
    setBusy("save");
    setBanner(null);
    try {
      const r = await api.vehicleConsignmentNotes.save({
        userId: user.id,
        saleId,
        noteId,
        destination,
        dateOfLifting,
        vehicleNumber,
        consignerName,
        consignerDesignation,
        dateOfConsignment,
        receiverName,
        receiverNicNo,
        receiverNicPlaceOfIssue,
        receivedDate: receivedDate.trim(),
      });
      if (r.ok === false) {
        setBanner({ type: "error", text: r.error });
      } else {
        setNoteId(r.id);
        setConsignmentNoteNo(r.consignmentNoteNo);
        setNoteStatus("PENDING");
        setBanner({
          type: "ok",
          text: noteId
            ? "Consignment note updated."
            : `Created ${r.consignmentNoteNo}.`,
        });
      }
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Save failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!noteId) return;
    setBusy("del");
    setBanner(null);
    try {
      const r = await api.vehicleConsignmentNotes.delete({
        id: noteId,
        userId: user.id,
      });
      if (r.ok === false) {
        setBanner({ type: "error", text: r.error });
      } else {
        setNoteId(null);
        setConsignmentNoteNo("");
        setNoteStatus(null);
        setBanner({ type: "ok", text: "Pending consignment note deleted." });
      }
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Delete failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function onValidate() {
    if (!noteId) return;
    setBusy("val");
    setBanner(null);
    try {
      const r = await api.vehicleConsignmentNotes.validate({
        id: noteId,
        userId: user.id,
      });
      if (r.ok === false) {
        setBanner({ type: "error", text: r.error });
      } else {
        setNoteStatus("VALIDATED");
        setValidatedByName(user.name);
        setValidatedAtIso(new Date().toISOString());
        setBanner({ type: "ok", text: "Consignment note validated." });
      }
    } catch (error) {
      setBanner({
        type: "error",
        text: error instanceof Error ? error.message : "Validate failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  const noteValidated = noteStatus === "VALIDATED";
  const draftLocked = noteValidated || !canDraft;
  const saleNotValidated = saleStatus !== "VALIDATED";
  const saveDisabled =
    busy !== null || !saleId || saleNotValidated || draftLocked || !canDraft;
  const layout = layoutForDisposition(saleDisposition);
  const isBordereau = layout === "bordereau";

  return (
    <div class="sales-client">
      <div class="sales-panel">
        <h2 class="vcn-panel-title">{consignmentFormTitle(saleDisposition)}</h2>
        <p class="sales-hint">{consignmentFormHint(saleDisposition)}</p>
      </div>

      {banner ? (
        <div
          class={`sales-banner ${
            banner.type === "error" ? "sales-banner-error" : "sales-banner-ok"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      <div class="sales-panel">
        <h3 class="vcn-panel-title">Open</h3>
        <div class="sales-form-grid">
          <label class="sales-field">
            <span>Sale invoice no.</span>
            <div class="vcn-open-row">
              <input
                value={invoiceLookup}
                onInput={(e) =>
                  setInvoiceLookup((e.target as HTMLInputElement).value)
                }
                placeholder="Invoice no."
              />
              <button
                type="button"
                class="sales-btn-primary"
                disabled={busy !== null || !invoiceLookup.trim()}
                onClick={() => void onLoadByInvoice()}
              >
                {busy === "inv" ? "Loading…" : "Load sale"}
              </button>
            </div>
          </label>
          <label class="sales-field">
            <span>VCN no.</span>
            <div class="vcn-open-row">
              <input
                value={vcnLookup}
                onInput={(e) =>
                  setVcnLookup((e.target as HTMLInputElement).value)
                }
                placeholder="VCN-2026-000001"
              />
              <button
                type="button"
                class="sales-btn-secondary"
                disabled={busy !== null || !vcnLookup.trim()}
                onClick={() => void onLoadByVcn()}
              >
                {busy === "vcn" ? "Loading…" : "Load note"}
              </button>
            </div>
          </label>
        </div>
      </div>

      {saleId ? (
        <section class="sales-panel">
          <div class="sales-panel-header">
            <div>
              <h3 class="vcn-panel-title">
                {isBordereau
                  ? "Sale & delivery order context"
                  : "Sale & products"}
              </h3>
              <p class="sales-hint">
                Invoice <strong>{invoiceNo}</strong>
                {consignmentNoteNo ? (
                  <>
                    {" "}
                    · VCN <strong>{consignmentNoteNo}</strong>
                  </>
                ) : null}
              </p>
            </div>
            {noteId ? (
              <button
                type="button"
                class="sales-btn-secondary"
                onClick={() => setPrintNoteId(noteId)}
              >
                View / print
              </button>
            ) : null}
          </div>

          {saleNotValidated ? (
            <p class="sales-hint-warn">
              This sale is not validated yet. Validate the sale under Sales
              before saving a consignment note.
            </p>
          ) : null}

          {noteStatus ? (
            <p class="sales-hint">
              Note status: <strong>{noteStatus}</strong>
              {noteValidated ? (
                <span>
                  {" "}
                  · Validated by <strong>{validatedByName || "—"}</strong>
                  {validatedAtIso ? (
                    <span>
                      {" "}
                      (
                      {new Date(validatedAtIso)
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                      )
                    </span>
                  ) : null}
                </span>
              ) : null}
            </p>
          ) : null}

          <div class="sales-form-grid">
            <div class="sales-field">
              <span>From (sales point)</span>
              <div class="vcn-readonly">{fromName}</div>
            </div>
            <div class="sales-field">
              <span>Customer</span>
              <div class="vcn-readonly">{customerName}</div>
            </div>
            {isBordereau ? (
              <>
                <div class="sales-field">
                  <span>Lifting delivery order</span>
                  <div class="vcn-readonly">{doNo ?? "—"}</div>
                </div>
                <div class="sales-field">
                  <span>Qty lifted (this sale)</span>
                  <div class="vcn-readonly">{thisSaleLifted} kg</div>
                </div>
              </>
            ) : (
              <div class="sales-field sales-field-span-2">
                <span>Disposition</span>
                <div class="vcn-readonly">
                  {saleDisposition === "RATION"
                    ? "Ration"
                    : saleDisposition === "PUBLIC_RELATION"
                      ? "Public relation"
                      : "—"}
                </div>
              </div>
            )}
          </div>

          {isBordereau ? (
            <div class="vcn-qty-strip">
              <div>
                <div class="sales-hint">Paid (DO)</div>
                <div>
                  <strong>{paidQty}</strong>
                </div>
              </div>
              <div>
                <div class="sales-hint">Lifted (validated)</div>
                <div>
                  <strong>{liftedQty}</strong>
                </div>
              </div>
              <div>
                <div class="sales-hint">Balance</div>
                <div>
                  <strong>{balanceQty}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div class="vcn-products-preview">
              <h4 class="vcn-panel-title">Products (from sale)</h4>
              <table class="vcn-products-preview-table">
                <thead>
                  <tr>
                    <th>SN</th>
                    <th>Product</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {saleLines.length === 0 ? (
                    <tr>
                      <td colSpan={3} class="sales-muted">
                        No sale lines.
                      </td>
                    </tr>
                  ) : (
                    saleLines.map((line, index) => (
                      <tr key={`${line.productName}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{line.productName}</td>
                        <td>
                          {line.qtyUnits?.trim()
                            ? line.qtyUnits
                            : `${line.qtyKg} kg`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <h3 class="vcn-panel-title">Consignment details</h3>
          <div class="sales-form-grid">
            <label class="sales-field sales-field-span-2">
              <span>To (destination)</span>
              <textarea
                value={destination}
                onInput={(e) =>
                  setDestination((e.target as HTMLTextAreaElement).value)
                }
                disabled={draftLocked}
                placeholder="Customer destination address"
                rows={3}
              />
            </label>
            <label class="sales-field">
              <span>Date of lifting</span>
              <input
                type="date"
                value={dateOfLifting}
                onInput={(e) =>
                  setDateOfLifting((e.target as HTMLInputElement).value)
                }
                disabled={draftLocked}
              />
            </label>
            <label class="sales-field">
              <span>Vehicle no.</span>
              <input
                value={vehicleNumber}
                onInput={(e) =>
                  setVehicleNumber((e.target as HTMLInputElement).value)
                }
                disabled={draftLocked}
              />
            </label>

            <div class="vcn-parties sales-field-span-full">
              <div class="vcn-party-col">
                <label class="sales-field">
                  <span>Consigner (staff at sales point)</span>
                  <input
                    value={consignerName}
                    onInput={(e) =>
                      setConsignerName((e.target as HTMLInputElement).value)
                    }
                    disabled={draftLocked}
                    placeholder="Full name"
                  />
                </label>
                <label class="sales-field">
                  <span>Consigner designation</span>
                  <input
                    value={consignerDesignation}
                    onInput={(e) =>
                      setConsignerDesignation(
                        (e.target as HTMLInputElement).value,
                      )
                    }
                    disabled={draftLocked}
                    placeholder="name of the consigner"
                  />
                </label>
                <label class="sales-field">
                  <span>Date of consignment</span>
                  <input
                    type="date"
                    value={dateOfConsignment}
                    onInput={(e) =>
                      setDateOfConsignment((e.target as HTMLInputElement).value)
                    }
                    disabled={draftLocked}
                    placeholder="date of the consignment"
                  />
                </label>
              </div>
              <div class="vcn-party-col">
                <label class="sales-field">
                  <span>Receiver name</span>
                  <input
                    value={receiverName}
                    onInput={(e) =>
                      setReceiverName((e.target as HTMLInputElement).value)
                    }
                    disabled={draftLocked}
                    placeholder="full name of the receiver"
                  />
                </label>
                <label class="sales-field">
                  <span>Receiver NIC no.</span>
                  <input
                    value={receiverNicNo}
                    onInput={(e) =>
                      setReceiverNicNo((e.target as HTMLInputElement).value)
                    }
                    disabled={draftLocked}
                    placeholder="NIC number of the receiver"
                  />
                </label>
                <label class="sales-field">
                  <span>Place of issue (NIC)</span>
                  <input
                    value={receiverNicPlaceOfIssue}
                    onInput={(e) =>
                      setReceiverNicPlaceOfIssue(
                        (e.target as HTMLInputElement).value,
                      )
                    }
                    disabled={draftLocked}
                    placeholder="place of issue of the receiver's NIC"
                  />
                </label>
                <label class="sales-field">
                  <span>Received date (optional)</span>
                  <input
                    type="date"
                    value={receivedDate}
                    onInput={(e) =>
                      setReceivedDate((e.target as HTMLInputElement).value)
                    }
                    disabled={draftLocked}
                  />
                </label>
              </div>
            </div>
          </div>

          <div class="sales-actions">
            <button
              type="button"
              class="sales-btn-primary"
              disabled={saveDisabled}
              onClick={() => void onSave()}
            >
              {busy === "save"
                ? "Saving…"
                : noteId
                  ? "Save changes"
                  : "Save (create note)"}
            </button>
            {noteId && noteStatus === "PENDING" && canDraft ? (
              <button
                type="button"
                class="sales-btn-danger"
                disabled={busy !== null}
                onClick={() => void onDelete()}
              >
                {busy === "del" ? "Deleting…" : "Delete draft"}
              </button>
            ) : null}
            {noteId && noteStatus === "PENDING" && canValidate ? (
              <button
                type="button"
                class="sales-btn-secondary"
                disabled={busy !== null}
                onClick={() => void onValidate()}
              >
                {busy === "val" ? "Validating…" : "Validate"}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {printNoteId ? (
        <ConsignmentNotePrintView
          noteId={printNoteId}
          onClose={() => setPrintNoteId(null)}
        />
      ) : null}
    </div>
  );
}
