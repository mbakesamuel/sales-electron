# Inventory and stock

Sidebar section: **Stocks**.

## Stock hub

**Stock** opens the inventory workspace with tabs:

| Tab | Purpose |
|-----|---------|
| **On hand** | Live balances by product and storage location. |
| **Movements** | Ledger of quantity changes. |
| **Receipts** | Goods in. |
| **Transfers** | Move between storage locations. |
| **Adjustments** | Manual corrections (including carry-forward stock postings tagged as such). |

Core ideas:

| Concept | Meaning |
|---------|---------|
| **Stock balance** | On-hand quantity by product and storage location (and sales point). |
| **Stock movement** | Ledger of quantity changes from receipts, transfers, adjustments, sales, etc. |
| **Receipt** | Goods in. |
| **Transfer** | Move between storage locations. |
| **Adjustment** | Manual correction (including carry-forward stock postings tagged as such). |

All posting dates must fall in the **open financial month**.

## Opening stock balances (carry-forward stock)

Screen: **Opening Stock balances** (`carry-forward-stock`).

Enter opening / carried-forward on-hand quantities by **sales point** and **storage location**, typically as a batch by product.

These post as stock adjustments with a carry-forward source kind so movements and reports can distinguish them from ordinary adjustments.

**Dating:** Carry-forward stock only counts from its posting date on period-faithful stock reports. For a January report to show opening stock, post CF dated on or before January’s month end (not with a later month’s date).

## Practical tips

- Sellable storage locations must exist for the sales point used on invoices.
- After large opening-stock entry, refresh **Stock report** / **Stock summary** to verify (stock report qty is reconstructed as of the report as-at date from movements).
- Hide-zero report settings can hide empty locations; turn that off in **Report settings** if you need to see zeros.

Next: [Sales budgets](07-sales-budgets.md).
