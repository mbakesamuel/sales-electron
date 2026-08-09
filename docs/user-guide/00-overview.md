# User guide — overview

**Sales Management Application** is a Windows desktop app for palm-oil commercial sales and inventory. It covers master data, delivery orders, sales invoices, stock, budgets, and printable management reports.

The window title bar, Windows installer, and Start Menu / desktop shortcuts are labelled **Sales Management Application**.

## Who this guide is for

Staff who create invoices, validate delivery orders, post stock, or print weekly/monthly reports. For installers and code structure, see the [developer guide](../developer-guide/00-overview.md).

## What you can do

| Area | Typical work |
|------|----------------|
| **General Parameters** | Company settings, financial year/month, sales points, storage, tax, payment methods |
| **Customers** | Customer accounts and customer types |
| **Products** | Catalog, categories, scheduled unit prices |
| **Sales budget** | Annual quantities, monthly/weekly phasing views |
| **Stocks** | Balances, receipts, transfers, adjustments, opening stock |
| **Delivery Order** | Delivery orders, validation queue, and opening (carry-forward) commitments |
| **Sales** | Sales invoices (POS), including loading lines from a delivery order |
| **Reports** | Daily sales, stock, commitment, bottle oil, weekly deliveries, monthly delivery |
| **Users & access** | Users and role permissions (admin) |
| **Overview** | Home dashboard: monthly revenue trend, sales by category, and DO vs sales by month |

## Overview dashboard

The **Overview** sidebar item opens a three-part dashboard (not the old background image):

1. **Line chart** — daily validated sales revenue (gross) for the open month  
2. **Pie chart** — validated sales by product category (line net) for the open month  
3. **Bar chart** — validated delivery-order kg vs sales kg by month for the open financial year  

Totals use **validated** documents only. If no financial month is open, the dashboard asks you to open one. Use **Refresh** after posting new sales.

## Important concepts

- **Financial year / month** — Most posting (sales, stock, DOs) requires an **open** financial year and month. Close periods when the month is complete.
- **Validated vs pending** — Sales and delivery orders often start as pending and must be **validated** before they affect reports and balances the way management expects.
- **Product categories** — Flags on categories (`isMain`, `isBottled`) control how products appear on reports (loose palm oil vs bottled vs other/PKO). See [Customers and products](03-customers-products.md).
- **Delivery order (DO)** — Customer commitment that can be drawn down on sales invoices. Carry-forward commitments are stored as special validated DOs.

## Suggested reading order

1. [Getting started](01-getting-started.md)
2. [Organization setup](02-organization-setup.md) (first-time sites)
3. [Sales invoices](04-sales-invoices.md) and [Delivery orders](05-delivery-orders.md)
4. [Reports](08-reports.md)

If something does not appear as expected (especially on reports), see [Troubleshooting](10-troubleshooting.md).
