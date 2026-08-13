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

**Storage location rules:** Bottled products may share a location with other bottled products. Non-bottled (bulk) products may occupy a location with only **one** product at a time. Bottled and bulk stock must **not** share a location. Receipts, transfers in, adjustments, and opening stock that would break these rules are blocked until the conflicting stock is cleared.

All posting dates must fall in the **open financial month**.

## Opening stock balances (carry-forward stock)

Screen: **Opening Stock balances** (`carry-forward-stock`).

Enter opening / carried-forward on-hand quantities by **sales point** and **storage location**, typically as a batch by product.

These post as stock adjustments with a carry-forward source kind so movements and reports can distinguish them from ordinary adjustments.

**Dating:** Choose a date in the batch form (must fall in the **open financial month**). That date becomes the adjustment / movement `occurredAt`. On the **Stock report** it counts from that date. On **Monthly stock reconciliation**, posted carry-forward LPO qty in the open month is included in **Opening stock** (one-time backlog), not under Reception.

## Bin card

Screen: **Bin card** (`stock-bin-card`). Also reachable from **Stock → Open bin card**.

Pick a **product** (required) plus optional sales point, storage location, condition, and date range. The main screen shows a stock-style table:

- Opening balance (movements before the From date)
- Each movement as **In** / **Out** with a running **Balance**
- Closing balance

Use **Open report** to open a printable bin card in a secondary window (**Print** / **Save PDF**), same pattern as other reports. The report window opens in **A4 portrait** layout.

Quantities use the product’s stock unit (Kg for bulk, pack units for bottled). Movements are limited to the **open financial month** on the main screen date pickers.

## Practical tips

- Sellable storage locations must exist for the sales point used on invoices.
- Do not mix bulk products in one location (e.g. LPO and PKO in one pit tank), and do not mix bottled oil with bulk in the same location; clear the conflicting stock first. Multiple bottled products in one location are allowed.
- After large opening-stock entry, refresh **Stock report** / **Stock summary** to verify (stock report qty is reconstructed as of the report as-at date from movements).
- Hide-zero report settings can hide empty locations; turn that off in **Report settings** if you need to see zeros.

Next: [Sales budgets](07-sales-budgets.md).
