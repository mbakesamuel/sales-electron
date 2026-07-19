# Delivery orders

## Delivery orders

Screen: **Delivery Order → Delivery orders**.

Delivery orders (DOs) record customer commitments by product and sales point. After validation, remaining quantities can be drawn down on sales invoices.

### Typical lifecycle

1. Create a DO: customer, sales point, date, lines (qty / price), payments as required.
2. Save (pending).
3. An authorized user **validates** the DO (`validate_delivery_orders` permission).
4. Sales clerks pick remaining balances on the Sales Invoice screen.
5. Optional: cancel a validated DO if you have `cancel_validated_delivery_order`.

Pending DOs do **not** appear in Pick DO. Only **validated** DOs with remaining kg are listed.

### Numbering

The system allocates delivery order numbers (including a separate sequence style for carry-forward DOs).

## Opening commitment balances (carry-forward)

Screen: **Delivery Order → Opening commitment balances** (`carry-forward-commitments`).

Use this to enter **opening / carried-forward** customer commitments that should appear on commitment reports and be sellable via Pick DO.

**How it is stored**

- For each **customer + sales point**, the app maintains **one** validated delivery order with `sourceKind = CARRY_FORWARD`.
- Each product is a **line** on that DO (not a separate DO per product).
- Adjusting outstanding qty updates the line while respecting quantities already sold against that DO number.

On Sales → Pick DO, these rows show with a **CF** marker and are listed **per product** with remaining kg.

## Consignment notes

Where enabled in your build/navigation, **Consignment notes** (`vehicle-consignment-notes`) manage vehicle consignment documents related to deliveries. Use them according to local operating procedure; they are separate from DO validation.

Next: [Inventory and stock](06-inventory-stock.md).
