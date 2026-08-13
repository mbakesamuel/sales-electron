# Sales invoices

Screen: **Sales → Sales Invoice**.

Use this screen to create, look up, print, and (with permission) validate or delete sales.

The Sales area has two tabs: **Sales screen** (create / edit) and **Invoice list**.

## Modes and dispositions

- **Loose vs bottle** — At sales points that support bottled product mode, you can switch between loose (kg) and bottle (units) lines. Bottle mode hides delivery-order picking.
- **Sale disposition** — Normal commercial sales vs special cases such as **Ration** or **Public relation**. Special dispositions change customer/payment requirements (often invoice-name only, no DO, no payments).

## Creating a normal sale

1. Enter the **Booklet serial no.** from the paper booklet (required before save).
2. Select **registered customer** and **sales point**.
3. Set the transaction date (must fall in the open posting period).
4. Optionally link a **delivery order** (see below).
5. Add product lines (qty, price, storage location).
6. Enter payments so paid total matches the invoice total (for normal dispositions).
7. Save. The sale is typically **pending** until validated.

Vehicle number is required for loose/normal sales that need it.

### Booklet serial number

New invoices require a **Booklet serial no.** typed from the physical booklet:

- Digits only (no letters or punctuation).
- At most 20 digits.
- Must be unique among invoices (duplicates are rejected).
- Immutable after save — you cannot change the serial on an existing invoice.
- Older invoices that still use legacy `INV-…` numbers remain loadable for lookup and printing.

### Stock as of invoice date

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
- **Delete** — Available according to status and permissions; prefer correcting before validation when possible.

## Invoice list

Screen tab: **Invoice list**. Default filter is the **open posting month** (`dateIssued`), not the calendar month on the PC. **Open year** shows the financial year through the report as-at date. Use **All time** when searching an invoice number from another period.

## Print

Use the invoice print flow from the sales screen after save. Company header comes from app settings. The printout includes a **QR code** (top right) encoding the invoice number, date, customer, net/gross totals, and taxpayer ID when present — scan it to verify those fields against the printed invoice.

Next: [Delivery orders](05-delivery-orders.md). Developer detail for Pick DO: [Domain modules](../developer-guide/05-domain-modules.md).
