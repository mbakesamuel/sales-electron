# Sales invoices

Screen: **Sales → Sales Invoice**.

Use this screen to create, look up, print, and (with permission) validate or delete sales.

## Modes and dispositions

- **Loose vs bottle** — At sales points that support bottled product mode, you can switch between loose (kg) and bottle (units) lines. Bottle mode hides delivery-order picking.
- **Sale disposition** — Normal commercial sales vs special cases such as **Ration** or **Public relation**. Special dispositions change customer/payment requirements (often invoice-name only, no DO, no payments).

## Creating a normal sale

1. Select **registered customer** and **sales point**.
2. Set the transaction date (must fall in the open posting period).
3. Optionally link a **delivery order** (see below).
4. Add product lines (qty, price, storage location).
5. Enter payments so paid total matches the invoice total (for normal dispositions).
6. Save. The sale is typically **pending** until validated.

Vehicle number is required for loose/normal sales that need it.

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
4. Click a row — the app **looks up the DO and loads that product’s remaining qty and price onto the invoice in one step**. Other products on the same DO remain available for later picks.

### Manual Lookup

1. Type a DO number (or pick first without applying — pick already loads).
2. Click **Lookup** to preview ordered / sold / balance per product.
3. Click **Load lines from DO** to load **all** products with remaining balance (replaces invoice lines).

If the DO customer differs from the selected customer, loading lines switches the customer to the DO’s customer.

### After save

The invoice stores the delivery order number so later sales against the same DO reduce remaining balance (used by Pick DO and commitment reports).

## Validate and delete

- **Validate** — Requires the `validate_sales` action permission. Re-checks stock **as of the invoice date** (see above), then deducts live inventory. Validated sales appear on delivery/stock-style reports that filter on validated status.
- **Delete** — Available according to status and permissions; prefer correcting before validation when possible.

## Print

Use the invoice print flow from the sales screen after save. Company header comes from app settings.

Next: [Delivery orders](05-delivery-orders.md). Developer detail for Pick DO: [Domain modules](../developer-guide/05-domain-modules.md).
