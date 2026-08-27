# Reports

Sidebar section: **Reports**, grouped as **Daily**, **Weekly**, and **Monthly**. Printable report screens open in an **in-app overlay** (dimmed backdrop over the main window) with **Print** and **Save PDF**; close the overlay to return to the app. Use **Open report** on the placeholder if you closed the overlay. Most reports use company header settings and an **as-at** date of the earlier of **today** and the **open financial month’s end** (so reopening January prints as at 31 Jan). Stock quantities on stock / stock-commitment / bottle-oil stock sections are rebuilt from movements through that as-at date. **Commitment** outstanding (Commitment report and stock-commitment commitment column) uses validated DOs and linked sales with `dateIssued` on or before as-at — not today’s live Pick DO balances. Several support **Comments** (toolbar) — company-wide text shown above the footer when non-empty.

**Report settings** (General Parameters) can hide zero/empty rows across stock and delivery-style reports. The same screen manages the **report signatory** history (name + title + effective-from date). Printed footers use the latest entry whose effective date is on or before the report’s as-at date.

## Report catalog

### Daily

| Screen | Purpose |
|--------|---------|
| **Daily sales report** | Validated sales for a chosen date (and optional sales point): by product with DO no., vehicle, qty, DO balance; customer-type summary; print / CSV / comments. |

### Weekly

| Screen | Purpose |
|--------|---------|
| **Stock summary report** | Combined stock and commitment view for management. |
| **Stock report** | Stock by sales point / storage layout (loose, bottled packs, kernel splits, etc.). |
| **Commitment report** | Outstanding validated DO balances by customer / sales point (**as of** report as-at). |
| **Bottle oil stock & sales** | Bottled stock matrix and sales by pack. |
| **Bottled Sales Report** | Bottled issues for a chosen week in the open month (Mon–Fri detail; estimate basis options). |
| **Sales/delivery report** | Weekly loose + bottled + other/PKO deliveries (week picker). |

### Monthly

| Screen | Purpose |
|--------|---------|
| **Monthly delivery (Jan–Jun)** | Half-year delivery report H1. |
| **Monthly delivery (Jul–Dec)** | Half-year delivery report H2. |
| **Monthly stock reconciliation** | Open-month LPO opening (prior balance + **Opening Stock / carry-forward** backlog) / reception / issues / calculated stock (physical & variance blank in v1), plus BPO and palm-kernel rows by sales point. |
| **Monthly Payment/Delivery** | Open-month weekly breakdown: **Payments** = bottled oil kg + value; **Deliveries** = other products kg + value (sales without taxes). |
| **Deliveries by Destination** | Open-month weekly non-bottled deliveries (kg) by destination: Industries, Wholesales, Retail, CDC Workers, Makoko Farms. |
| **Monthly Palm Oil Sales** | Full-year LPO by destination (incl. Makoko) and BPO in tons and '000 FRS (taxes excluded); Jan–Jul and Aug–Dec + TOTAL. |
| **Revenue & taxes** | Validated invoice **net**, **VAT**, **sales tax**, and **gross** for the open month or FY to date (optional sales point); by day/month and by sales point. |
| **Industry product monthly sales** | Full-year **Industry** sales by sales point for each non-LPO / non-bottled product (tons and '000 FRS); Jan–Jul and Aug–Dec + TODATE. |
| **Bottled palm oil sales return** | Open-month bottled B/F (carry-forward), receptions by supplier, Cash Sales / GM's Public Relations issues, and balance by pack (qty, kg, value without taxes). |
| **Bottled Oil monthly** | Open-month Bottle Oil **Ration** and **Public relation** sales by invoice: date, customer, address, pack qty (1x20L / 3x5L / 1x15L), received by, amount, VEH. C. NO (consignment note). |
| **Other product sales and deliveries** | Open-month non-LPO / non-bottled sales by sales point and product; DELIVERIES kg + F.CFA (tax excluded); PAYMENTS blank. |
| Budget monthly/weekly crosstabs | See [Sales budgets](07-sales-budgets.md). |

## Daily sales report

- Includes only **validated** sales on the selected **report date**.
- Optional **sales point** filter.
- Lines grouped by product; each line can show DO number, vehicle, quantity, and remaining DO balance where linked.
- Customer-type summary block at the end.
- Supports print, CSV export, and report comments.

## Sales/delivery report (weekly)

- Includes only **validated** sales in the selected week.
- **Week picker** — choose any week that overlaps the **open financial month**, capped at as-at. Local calendar dates are used (no UTC day shift).
- **1) Loose palm oil** — products in **main** categories, totals by customer-type bucket × sales point (not by customer name).
- **2) Bottled palm oil** — bottled packs (column order includes 1×15L, 3×5L, 1×20L jug).
- **3) Other products / PKO** — non-main, non-bottled products (e.g. Palm Kernel Oil) as named kg rows.

If a PKO sale is “missing”, open the correct week and scroll to section 3 — customer names are not printed on this report.

## Bottled Sales Report

- Same **open-month week picker** as Sales/delivery (Mon–Fri day columns for the selected week).
- Month / YTD / prior-month comparison blocks still use the report **as-at** date.
- **Week ESTM** basis (working days vs ISO week) affects the budget estimate share only.

## Monthly Payment/Delivery

- Open financial month only (through report as-at).
- One row per calendar week (Mon–Sun clipped to the month).
- **Payments** = validated bottled-oil sales (kg + line net FCFA).
- **Deliveries** = validated sales of all other (non-bottled) products (kg + line net FCFA).
- Banner: sales without taxes; TOTAL row; print / CSV / comments.

## Deliveries by Destination

- Open financial month only (through report as-at).
- One row per calendar week (Mon–Sun clipped to the month).
- Validated **non-bottled** sales only (kg).
- Columns: Industries, Wholesales, Retail, CDC Workers, Makoko Farms, Total — matched from customer name and customer type (and ration disposition → CDC Workers).
- Footer: column totals and **TOTAL %** of the grand total; print / CSV / comments.

## Monthly Palm Oil Sales

- Full **calendar financial year** through report as-at.
- **LPO** (main non-bottled) sales by destination — customer name and type; Makoko Farms supported.
- **BPO** bottled aggregate in tons and tax-excluded value ('000 FRS).
- Two half-year tables: **Jan–Jul** and **Aug–Dec + TOTAL**.

## Revenue & taxes

- Validated invoices by **date issued** through as-at.
- Filter: **open month** or **FY to date**; optional **sales point**.
- Summary row: invoice count, net, VAT, sales tax, gross (all tax-excluded net where noted).
- Breakdown tables: by day or month, and by sales point.
- Print / CSV / comments.

## Industry product monthly sales

- Full calendar FY through as-at; **Industry** customers only.
- One section per non-LPO / non-bottled product with sales-point rows + TOTAL.
- Tons and tax-excluded value ('000 FRS); **Jan–Jul** and **Aug–Dec + TODATE**.

## Bottled palm oil sales return

- **Open month** only (through as-at).
- Opening B/F (prior balance + in-month carry-forward), receptions by supplier, **Cash Sales** and **GM's Public Relations** issues, closing balance.
- Pack columns (20L, 3×5L, 1×15L) in units, kg (0 dp), and value without taxes.

## Bottled Oil monthly

- Open-month **validated** Bottle Oil **Ration** and **Public relation** sales only.
- One row per invoice: date, customer, address, pack qty (1x20L / 3x5L / 1x15L), received by, amount (gross), VEH. C. NO (consignment note when present).
- Usual report header and signatory footer; print / CSV / comments.

## Other product sales and deliveries

- **Open month** only; non-LPO / non-bottled products.
- Rows grouped by sales point × product; **DELIVERIES** kg + F.CFA (tax excluded); **PAYMENTS** columns blank.
- **SUBTOTAL** per sales point and **GRAND TOTAL**.

## Report comments

Each report route can store its own comments (shared for the company). Empty comments hide the section. Stock & commitment legacy comments were migrated into the shared map.

## Print

Use **Print** on each screen. Print CSS hides toolbars (`no-print`) and applies shared report styling:

- Body class **`scr-print-mode`** during print (no per-report portrait/landscape body hacks on the newer monthly reports).
- Document chrome: **`scr-page`** / **`scr-document`** / **`scr-table`**; total rows use **`scr-row-total`**.
- Landscape is still used where needed (e.g. some monthly delivery layouts and the **weekly** sales-budget crosstab).

The **bin card report** window opens in **A4 portrait**; use Print or Save from that window like other report routes.

Next: [Users and permissions](09-users-permissions.md). Technical notes: [Reports engine](../developer-guide/06-reports-engine.md).
