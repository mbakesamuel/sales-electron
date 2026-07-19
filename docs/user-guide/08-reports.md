# Reports

Sidebar section: **Reports**. Most reports use company header settings and an **as-at** date derived from today within the open financial year. Several support **Comments** (toolbar) — company-wide text shown above the footer when non-empty.

**Report settings** (General Parameters) can hide zero/empty rows across stock and delivery-style reports.

## Report catalog

| Screen | Purpose |
|--------|---------|
| **Stock summary report** | Combined stock and commitment view for management. |
| **Stock report** | Stock by sales point / storage layout (loose, bottled packs, kernel splits, etc.). |
| **Commitment report** | Outstanding validated DO balances by customer / sales point. |
| **Bottle oil stock & sales** | Bottled stock matrix and sales by pack. |
| **Bottled weekly issues** | Bottled issues through the week (with estimate basis options). |
| **Sales / delivery report** | Weekly loose + bottled + other/PKO deliveries. |
| **Weekly print pack** | Multi-report print bundle (order selectable); embeds the same report documents without per-page comment editors. |
| **Monthly delivery (Jan–Jun)** | Half-year delivery report H1. |
| **Monthly delivery (Jul–Dec)** | Half-year delivery report H2. |
| Budget monthly/weekly crosstabs | See [Sales budgets](07-sales-budgets.md). |

## Sales / delivery report (weekly)

- Includes only **validated** sales in the selected week.
- **Week picker** — choose any week that overlaps the **open financial month**, capped at today. Local calendar dates are used (no UTC day shift).
- **1) Loose palm oil** — products in **main** categories, totals by customer-type bucket × sales point (not by customer name).
- **2) Bottled palm oil** — bottled packs (column order includes 1×15L, 3×5L, 1×20L jug).
- **3) Other products / PKO** — non-main, non-bottled products (e.g. Palm Kernel Oil) as named kg rows.

If a PKO sale is “missing”, open the correct week and scroll to section 3 — customer names are not printed on this report.

## Report comments

Each report route can store its own comments (shared for the company). Empty comments hide the section. Stock & commitment legacy comments were migrated into the shared map.

## Print

Use **Print** on each screen (or the weekly print pack). Print CSS hides toolbars (`no-print`) and formats tables for paper.

Next: [Users and permissions](09-users-permissions.md). Technical notes: [Reports engine](../developer-guide/06-reports-engine.md).
