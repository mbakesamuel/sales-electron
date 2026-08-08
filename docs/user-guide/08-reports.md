# Reports

Sidebar section: **Reports**, grouped as **Daily**, **Weekly**, and **Monthly**. Most reports use company header settings and an **as-at** date of the earlier of **today** and the **open financial month’s end** (so reopening January prints as at 31 Jan). Stock quantities on stock / stock-commitment / bottle-oil stock sections are rebuilt from movements through that as-at date. **Commitment** outstanding (Commitment report and stock-commitment commitment column) uses validated DOs and linked sales with `dateIssued` on or before as-at — not today’s live Pick DO balances. Several support **Comments** (toolbar) — company-wide text shown above the footer when non-empty.

**Report settings** (General Parameters) can hide zero/empty rows across stock and delivery-style reports.

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
| **Weekly print pack** | Multi-report print bundle (order selectable); shared week picker for Sales/delivery and Bottled Sales Report; also includes **Sales budget (weekly)**. |

### Monthly

| Screen | Purpose |
|--------|---------|
| **Monthly delivery (Jan–Jun)** | Half-year delivery report H1. |
| **Monthly delivery (Jul–Dec)** | Half-year delivery report H2. |
| **Monthly stock reconciliation** | Open-month LPO opening / reception / issues / calculated stock (physical & variance blank in v1), plus BPO and palm-kernel rows by sales point. |
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

## Weekly print pack

- Shared week buttons apply to **Sales/delivery** and **Bottled Sales Report** in the pack; other reports stay as-at / period based.
- Selectable pack also includes **Sales budget (weekly)** alongside the delivery-style reports.

## Report comments

Each report route can store its own comments (shared for the company). Empty comments hide the section. Stock & commitment legacy comments were migrated into the shared map.

## Print

Use **Print** on each screen (or the weekly print pack). Print CSS hides toolbars (`no-print`) and formats tables for paper.

Next: [Users and permissions](09-users-permissions.md). Technical notes: [Reports engine](../developer-guide/06-reports-engine.md).
