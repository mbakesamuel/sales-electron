# Troubleshooting

## Cannot save sale / DO / stock document

- Confirm **financial year** and **financial month** are **open**.
- Check the document **date** falls inside the open month.
- For sales: payment total must match invoice total (normal dispositions); vehicle number may be required.
- **Bottle Oil** needs an active **Cash** payment method (code or name `CASH`). Loose sales hide Cash — use cheque, traite, or bank transfer.
- For **traite** payments on loose sales: enter trait no #, issued date, and maturity date (and bank when shown).
- For new sales and DOs: enter a **Booklet serial no.** (digits only, at most 20). Blank, letters, or punctuation are rejected.
- If save says the serial is already used, check the booklet — another invoice or DO already has that number.
- Ensure products, payment methods, and storage locations exist.
- **Insufficient stock as of …** — Sellable qty on that **invoice date** (from receipts/CF/movements through the date) is short at the chosen location. Change the date, reduce qty, or post stock dated on or before the invoice date. Today’s balance alone is not enough if stock arrived later.

## Sale or DO does not appear on reports

- Report filters usually require **validated** status — pending documents are excluded.
- Confirm the report **as-at / week / half** covers the document date.
- On **Sales/delivery report**, use the **week picker** for the week that contains the sale date.
- PKO / kernel products appear under **3) Other products / PKO**, not under loose palm oil, and **without customer names**.

## Stock report shows unexpected qty (or missing CF)

- Stock report qty is **as of the open month’s as-at** (earlier of today and month end), from movements — not the live On-hand tab.
- Carry-forward / receipts only count from their **posting date**. CF posted in July does not appear when January is open.
- Inventory **On hand** always shows current live balance; that is expected.
- **Section order** on the Stock report is Palm Oil → PKO → Palm Kernel → PKC → Bottled (last). Non-bottled qty columns align to Palm Oil’s grid; bottled uses its own pack matrix.

## Commitment report shows unexpected outstanding

- Outstanding is **as of report as-at**: DOs and draw-down sales with `dateIssued` on or before that date.
- CF commitments only appear from their DO **`dateIssued`**. Pick DO always shows live remaining (not frozen by month).
- Later edits to CF line `orderQty` are not historical — reports use the current ordered qty minus sales through as-at.

## Pick DO is empty or missing a DO

- Customer and sales point must be selected (list is filtered to both).
- DO must be **validated**.
- Remaining balance must be greater than zero (fully sold DOs are omitted).
- Carry-forward commitments appear as **CF** rows, one line per product.

## Pick DO did not add lines

- Pick DO / Lookup **link** the delivery order; Pick opens **Add line** with the selected product prefilled. Confirm and save the line (or use **Add line** manually).

## Wrong report section for a product

- Check the product’s **category** flags: **Main** vs **Bottled** vs neither ([Customers and products](03-customers-products.md)).

## Zero rows missing on a report

- **Report settings → hide zero rows** may be on. Disable it to show empty rows.

## Permission denied / menu item missing

- Your role’s **route access** may be `none` or `read`.
- Validation buttons need **action** permissions, not only route write access. Ask an admin to adjust **Role permissions**.
- **Consignment validation** needs route `vehicle-consignment-validation` plus action `validate_vehicle_consignment_notes`. After migration `086`, restart the app once so the route is seeded.

## Overview looks wrong for my role

- Store Keepers see the Bottle Oil dashboard; senior/junior sales supervisors see the supervisor queues dashboard; other commercial roles see revenue / category / DO charts. Log out and back in after a role change.

## Print layout issues

- Use the in-app **Print** control so `scr-print-mode` styles apply.
- Toolbars are hidden via `no-print`; if content is clipped, try landscape where the screen offers it.

## App shows a blank screen or never reaches login

- Run the desktop app via **`npm run dev`** (or the installed **Sales Management Application** shortcut) — do **not** open `http://localhost:5173` in a browser tab. The UI requires the Electron preload API (`window.api`).
- If the window stays blank after a code update, restart **`npm run dev`** so Vite and Electron reload. Check the terminal for a red **Transform failed** or module import error.
- A broken import in a screen loaded at startup (for example the customers or stock modules) can block the whole app shell, including the login screen.

## Still stuck

Note the invoice/DO number, date, sales point, product, and whether the document is pending or validated — that is enough for support or a developer to trace the row in SQLite / logs. See [Developer guide — domain modules](../developer-guide/05-domain-modules.md).
