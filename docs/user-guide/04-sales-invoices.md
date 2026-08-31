# Sales invoices

Screens: **Sales → Sales Invoice** (loose / bulk) and **Sales → Bottle Oil sales** (bottled products).

Use these screens to create, look up, print, and (with permission) validate or delete sales.

Each area has two tabs: **Sales screen** (create / edit) and **Invoice list**.

## Modes and dispositions

- **Loose (Sales Invoice)** — Lines in kg; deduct from a **sales tank**. Delivery-order picking is available for normal dispositions with a registered customer.
- **Bottle Oil sales** — Separate screen for bottled products (units). Deducts from **Bottle Oil Store** (not a sales tank). No delivery-order picking. The per-invoice **Registered customer** checkbox is **never shown**; customer mode follows **App settings → Bottle Oil sales → Use registered customers** (off = invoice name only; on = directory customer required). **Ration** is available only when **Allow Ration disposition** is on in App settings (off by default). See [Organization setup](02-organization-setup.md).
- **Sale disposition** — Normal commercial sales vs special cases such as **Ration** or **Public relation**. Special dispositions use an **invoice name only** (no directory customer) and no delivery-order linking. **Line amounts work like normal sales**; payment method is **fixed by disposition** (not Cash or cheque). On loose Sales Invoice, **Ration** is limited to the **LPO** product category; **Public relation** uses Loose Palm Oil products. On Bottle Oil, Ration may be hidden by company setting; Public relation remains available.

## Creating a normal sale

1. Enter the **Booklet serial no.** from the paper booklet (required before save).
2. Select **customer** and **sales point**:
   - **Loose** — Use the **Registered customer** checkbox when selling to a directory account; uncheck for an invoice name only.
   - **Bottle Oil** — Invoice name only by default, or a directory customer when the company setting is on (no checkbox).
3. Set the transaction date (must fall in the open posting period).
4. Optionally link a **delivery order** (loose / normal / registered customer only — see below).
5. Add product lines (qty, price, storage location where required).
6. Enter payments so paid total matches the invoice total — see **Payments** below.
7. Save. The sale is typically **pending** until validated (unless your role has direct validate — see below).

**Unit price on lines** — By default (**App settings → Lock unit price from schedule**), **Add item** / **Edit item** resolve unit price from the product pricing schedule and the price field is read-only. Turn the setting off to allow manual overrides when the field is editable. See [Organization setup](02-organization-setup.md).

Vehicle number is required for loose/normal sales that need it.

## Payments

The paid total must equal the invoice total for all dispositions (including **Ration** and **Public relation**). Payment amount is **locked** to the invoice gross (auto-filled). For **normal** sales you choose the method; for **Ration** and **Public relation** the method is **read-only** and set automatically.

| Mode / disposition | Payment method | Notes |
|--------------------|----------------|-------|
| **Bottle Oil — normal** | **Cash** (read-only) | One payment line covering the full amount. |
| **Bottle Oil — Ration** | **Ration (deferred)** (read-only) | Full invoice amount; deferred CDC worker credit — not cash. |
| **Bottle Oil — Public relation** | **Public relation (complimentary)** (read-only) | Full invoice amount; complimentary GM issue — not cash. |
| **Loose — normal** | Cheque, Traite, Bank Transfer, etc. | **Cash is hidden**. Choose method from the dropdown. |
| **Loose — Ration** | **Ration (deferred)** (read-only) | Same deferred method as bottle Ration. |
| **Loose — Public relation** | **Public relation (complimentary)** (read-only) | Same complimentary method as bottle Public relation. |

### Traite (loose)

When the payment method kind is **Traite**, enter:

- **Trait no #**
- **Issued on** (date)
- **Maturity on** (date)
- **Bank** (when required for that method)

Cheque methods still use **Cheque #** and **Bank**. Bank transfer uses its reference / bank fields as configured.

## Booklet serial number

New invoices require a **Booklet serial no.** typed from the physical booklet:

- Digits only (no letters or punctuation).
- At most 20 digits.
- Must be unique among invoices (duplicates are rejected).
- Immutable after save — you cannot change the serial on an existing invoice.
- Older invoices that still use legacy `INV-…` numbers remain loadable for lookup and printing.

## Stock as of invoice date

On create and validate, the app checks **sellable stock as of the invoice date** (`dateIssued`) at the sales point and storage location — not only today’s live balance. Receipts, carry-forward stock, transfers, and prior sales through that date count; stock that arrived *after* the invoice date does not. Backdating an invoice before stock was on hand is blocked (even if you validate later, after a receipt).

Validated sales post stock movements stamped with the invoice date so later as-of checks stay consistent.

## Delivery order on the invoice

### When DO UI appears

Delivery order fields show for **loose**, **normal** disposition, with a **registered customer**.

### Pick DO (recommended)

1. Choose the customer and sales point first.
2. Click **Pick DO**. The list shows only **validated** DOs for **that customer and sales point** that still have remaining balance.
3. The list is **split by product**: each row is one product with remaining kg (not a single bulk total for the whole DO). Carry-forward DOs are marked **CF**.
4. Click a row — the app **links that delivery order**, switches to the DO’s customer if needed, and **opens Add line** with that product, remaining qty, and DO unit price. Confirm storage location (auto-picked from stock when possible) and save the line.
5. Use **Add line** again for more products; if a DO product was linked but the modal was closed, Add line still prefills that product until you save a line or clear the DO.

### Manual Lookup

1. Type a DO number (or use Pick DO).
2. Click **Lookup** to confirm the DO and link it (sets the DO number and adopts the DO customer). If the DO has exactly one product with remaining balance, Add line will prefill that product.
3. Add products with **Add line**.

### After save

The invoice stores the delivery order number so later sales against the same DO reduce remaining balance (used by Pick DO and commitment reports).

## Validate and delete

- **Validate** — Requires the `validate_sales` action permission. Re-checks stock **as of the invoice date** (see above), then deducts live inventory. Validated sales appear on delivery/stock-style reports that filter on validated status.
- **Direct validate (create + validate in one step)** — Users with the `direct_validate_sales` action (default: **ADMIN** and **MANAGER**) see **Validate invoice** and **Save as pending** when creating a new invoice. **Validate invoice** creates the sale and validates it in one step (stock is deducted immediately). **Save as pending** keeps the two-step workflow. Supervisors with `validate_sales` but not `direct_validate_sales` still validate pending invoices opened from the list or after a clerk saves.
- **Delete** — Available according to status and permissions; prefer correcting before validation when possible.

## Invoice list

Screen tab: **Invoice list**. Default filter is the **open posting month** (`dateIssued`), not the calendar month on the PC. **Open year** shows the financial year through the report as-at date. Use **All time** when searching an invoice number from another period.

## Print

Use the print flow from the sales screen after save. Company header comes from app settings (compact header typography on invoice/receipt prints — smaller than management reports). The printout includes a **QR code** encoding the invoice/receipt number, date, customer, net/gross totals, and taxpayer ID when present — scan it to verify those fields against the printed document.

- **Loose sales** — Prints a **sales invoice** (line items, taxes, payments, totals).
- **Bottle Oil sales** — Prints a **cash receipt**: same company header and QR, with receipt wording (“Received from … the sum of … in settlement of … For and on behalf of …”) instead of the invoice line table.

## Vehicle consignment notes

Under **Sales**:

| Screen | Purpose |
|--------|---------|
| **Consignment notes** | Prepare vehicle consignment notes linked to validated sales (lookup by invoice / VCN number, save, print). Allowed for **loose** sales and Bottle Oil **Ration** / **Public relation**; not for **normal** Bottle Oil cash sales. Print opens in the same report-style overlay as analytics reports; each A4 page shows **Original** and **Duplicate** stamped copies of the note. |
| **Consignment validation** | Queue of **pending** consignment notes for supervisors to review and validate (including bulk validate). |

Validation requires the `validate_vehicle_consignment_notes` action (default: ADMIN, MANAGER, SENIOR_SALES_SUPERVISOR; also grantable to custom roles such as junior supervisors). Pending notes appear on the **supervisor Overview** as a queue tile when that role uses the supervisor dashboard.

Next: [Delivery orders](05-delivery-orders.md). Developer detail for Pick DO: [Domain modules](../developer-guide/05-domain-modules.md).
