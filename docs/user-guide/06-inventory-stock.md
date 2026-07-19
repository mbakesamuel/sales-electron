# Inventory and stock

Sidebar section: **Stocks**.

## Stock hub

**Stock** opens the inventory workspace for balances and related documents (movements, receipts, transfers, adjustments), depending on your navigation/layout.

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

## Practical tips

- Sellable storage locations must exist for the sales point used on invoices.
- After large opening-stock entry, refresh **Stock report** / **Stock summary** to verify.
- Hide-zero report settings can hide empty locations; turn that off in **Report settings** if you need to see zeros.

Next: [Sales budgets](07-sales-budgets.md).
