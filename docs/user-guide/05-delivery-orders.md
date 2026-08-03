# Delivery orders

## Delivery orders

Screen: **Delivery Order → Delivery orders**.

Delivery orders (DOs) record customer commitments by product and sales point. After validation, remaining quantities can be drawn down on sales invoices.

The Delivery Order workspace has three tabs: **Delivery order** (create / edit), **DO list**, and **Validation queue**.

### Typical lifecycle

1. Create a DO: enter the **Booklet serial no.**, customer, sales point, date, lines (qty / price), payments as required.
2. Save (pending).
3. An authorized user **validates** the DO (`validate_delivery_orders` permission) — from the DO screen or the **Validation queue**.
4. Sales clerks pick remaining balances on the Sales Invoice screen.
5. Optional: cancel a validated DO if you have `cancel_validated_delivery_order`.

Pending DOs do **not** appear in Pick DO. Only **validated** DOs with remaining kg are listed.

### Booklet serial number

New delivery orders require a **Booklet serial no.** typed from the physical booklet:

- Digits only (no letters or punctuation).
- At most 20 digits.
- Must be unique among delivery orders (duplicates are rejected).
- Immutable after save.
- Older DOs that still use legacy `DO-…` numbers remain loadable for lookup and printing.

**Carry-forward** opening commitments are an exception: the system still allocates numbers in the `CF-{year}-{seq}` style. See below.

### DO list

The delivery-order **list** tab defaults to the **open posting month** (`dateIssued`). **Open year** covers the financial year through as-at; **All time** is for looking up a DO number outside the open period.

### Validation queue

Tab: **Validation queue** (visible when your role has `validate_delivery_orders`).

Shows pending delivery orders ready for validation. You can select multiple rows and **validate** them in bulk. Use this when a supervisor clears a backlog of clerk-entered DOs.

## Opening commitment balances (carry-forward)

Screen: **Delivery Order → Opening commitment balances** (`carry-forward-commitments`).

Use this to enter **opening / carried-forward** customer commitments that should appear on commitment reports and be sellable via Pick DO.

**How it is stored**

- For each **customer + sales point**, the app maintains **one** validated delivery order with `sourceKind = CARRY_FORWARD`.
- Each product is a **line** on that DO (not a separate DO per product).
- Adjusting outstanding qty updates the line while respecting quantities already sold against that DO number.
- Numbers are auto-allocated as `CF-{year}-{seq}` (no booklet serial).

**Dating:** The CF DO gets a **`dateIssued`** when first created (today within the open month, or month end). Commitment reports only include DOs with `dateIssued` on or before the report as-at date — so CF posted in July does not appear when January is open for reprinting. Pick DO always shows **live** remaining qty.

On Sales → Pick DO, these rows show with a **CF** marker and are listed **per product** with remaining kg.

Next: [Inventory and stock](06-inventory-stock.md).
