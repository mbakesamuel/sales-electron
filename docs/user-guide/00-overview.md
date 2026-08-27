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
| **Stocks** | Balances, receipts, transfers, adjustments, opening stock, **bin card** ledger |
| **Delivery Order** | Delivery orders, **DO tracking**, **transfer DO balance**, validation queue, and opening (carry-forward) commitments |
| **Sales** | Sales invoices (POS), Bottle Oil sales, sales validation, vehicle **consignment notes** and **consignment validation** |
| **Reports** | Daily sales, stock, commitment, bottle oil, weekly deliveries, monthly delivery/reconciliation, palm-oil sales, revenue & taxes, industry/PKO sections, bottled return, budget crosstabs |
| **Users & access** | Users and role permissions (admin) |
| **Overview** | Role-based home dashboard (commercial, Store Keeper, or supervisor) |

## Overview dashboard

The **Overview** sidebar item opens a dashboard that depends on your role:

| Role | Dashboard |
|------|-----------|
| **Admin / Manager / Statistics clerk** (and similar) | **Commercial** — daily revenue line, sales by category pie, DO kg vs sales kg by month |
| **Store Keeper** | **Bottle Oil** — open-month Bottle Oil revenue, sales by product, Bottle Oil units by month, invoice counts, bottled stock on hand |
| **Senior sales supervisor** / **Junior sales supervisor** (`JNR_SALES_SUP`) | **Supervisor** — queue tiles (pending sales, pending stock, pending consignments), revenue + sales by product charts, loose and bottled stock tables |

Totals use **validated** sales where charts show revenue. If no financial month is open, the dashboard asks you to open one. Use **Refresh** after posting new sales. Queue tiles navigate to the matching validation screen.

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
