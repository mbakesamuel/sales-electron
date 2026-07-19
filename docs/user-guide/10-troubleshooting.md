# Troubleshooting

## Cannot save sale / DO / stock document

- Confirm **financial year** and **financial month** are **open**.
- Check the document **date** falls inside the open month.
- For sales: payment total must match invoice total (normal dispositions); vehicle number may be required.
- Ensure products, payment methods, and storage locations exist.
- **Insufficient stock as of …** — Sellable qty on that **invoice date** (from receipts/CF/movements through the date) is short at the chosen location. Change the date, reduce qty, or post stock dated on or before the invoice date. Today’s balance alone is not enough if stock arrived later.

## Sale or DO does not appear on reports

- Report filters usually require **validated** status — pending documents are excluded.
- Confirm the report **as-at / week / half** covers the document date.
- On **Sales / delivery**, use the **week picker** for the week that contains the sale date.
- PKO / kernel products appear under **3) Other products / PKO**, not under loose palm oil, and **without customer names**.

## Pick DO is empty or missing a DO

- Customer and sales point must be selected (list is filtered to both).
- DO must be **validated**.
- Remaining balance must be greater than zero (fully sold DOs are omitted).
- Carry-forward commitments appear as **CF** rows, one line per product.

## Pick DO loaded the wrong quantity

- One-click pick loads **only the selected product’s** remaining balance.
- Use **Lookup → Load lines from DO** to load **all** remaining products at once.

## Wrong report section for a product

- Check the product’s **category** flags: **Main** vs **Bottled** vs neither ([Customers and products](03-customers-products.md)).

## Zero rows missing on a report

- **Report settings → hide zero rows** may be on. Disable it to show empty rows.

## Permission denied / menu item missing

- Your role’s **route access** may be `none` or `read`.
- Validation buttons need **action** permissions, not only route write access. Ask an admin to adjust **Role permissions**.

## Print layout issues

- Use the in-app **Print** control so `scr-print-mode` styles apply.
- Toolbars are hidden via `no-print`; if content is clipped, try landscape where the screen offers it.

## Still stuck

Note the invoice/DO number, date, sales point, product, and whether the document is pending or validated — that is enough for support or a developer to trace the row in SQLite / logs. See [Developer guide — domain modules](../developer-guide/05-domain-modules.md).
