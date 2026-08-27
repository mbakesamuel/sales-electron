# Users and permissions

## Users

**Users** (Users & access) maintains login accounts and role assignment.

When you create a user (or reset their password), enter a **temporary password** and share it with them. On first sign-in they must change that password before they can use the app.

## Roles (defaults)

Default route access is defined per role (admins can change the matrix):

| Role | Typical access |
|------|----------------|
| **ADMIN** | All routes write; manage permissions. Commercial Overview. |
| **MANAGER** | Most routes write (not user admin); validate sales/DOs/consignments; can cancel validated DOs. Commercial Overview. |
| **SENIOR_SALES_SUPERVISOR** | Operations, customers, inventory read/write; validate sales/DOs/consignments. **Supervisor Overview** (queues + stock). |
| **JNR_SALES_SUP** (junior sales supervisor) | Custom/manageable role (may already exist in production DBs). Shares **Supervisor Overview** with senior supervisors when granted matching routes; consignment validation route seeded in migration `086`. |
| **STATISTICS_CLERK** | Broad **read** on operations, budgets, reports, and financial/tax screens; **write** on **Stock** and **Bottled Stock** for company-wide transfers (bulk + bottled). Primary transfer operator — draft, dispatch, and location moves across all collection points. No validate actions by default. Commercial Overview. |
| **STORE_KEEPER** | Bottled stock and Bottle Oil sales at their assigned collection point; **receive only** for incoming stock transfers (cannot draft or dispatch). Selected reports; **Bottle Oil Overview**. Cannot validate by default. |

## Route access vs actions

- **Route access** — `none` / `read` / `write` per screen (sidebar entry).
- **Actions** (separate toggles):

| Action | Meaning |
|--------|---------|
| `validate_sales` | Validate sales invoices (pending invoices saved by clerks or yourself). |
| `direct_validate_sales` | Create and validate a sales invoice in one step from the POS screen (skip pending). |
| `validate_delivery_orders` | Validate delivery orders (including the **Validation queue** tab under Delivery Order). |
| `cancel_validated_delivery_order` | Cancel an already validated DO. |
| `transfer_delivery_order_balance` | Move remaining DO kg to another sales point (**Transfer DO balance** screen). |
| `validate_vehicle_consignment_notes` | Validate vehicle consignment notes (**Consignment validation** queue). |
| `manage_permissions` | Edit the permission matrix (**Role permissions**). |

Opening **Sales Invoice** does not by itself allow validation — the action flag must be on. The Delivery Order **Validation queue** tab appears only when `validate_delivery_orders` is granted. **Consignment validation** needs route access plus `validate_vehicle_consignment_notes`.

### Sales / consignment routes

| Route | Screen |
|-------|--------|
| `sales` | Loose Sales Invoice |
| `bottle-oil-sales` | Bottle Oil sales |
| `sales-validation` | Pending sales validation queue |
| `vehicle-consignment-notes` | Prepare / print consignment notes |
| `vehicle-consignment-validation` | Pending consignment validation queue |

### Delivery order routes

| Route | Screen |
|-------|--------|
| `delivery-orders` | Create / edit, DO list, validation queue |
| `delivery-order-tracking` | DO tracking lookup and printable tracking report |
| `delivery-order-transfer` | Transfer remaining DO balance between sales points |

## Stock module routes

The **Stock** sidebar screen combines several permission routes. After changing the matrix, affected users must **log out and sign in again** for buttons to update.

| Route | Stock tab / screen | None | Read | Write |
|-------|-------------------|------|------|-------|
| `stock-balance` | On hand | Hidden | View balances | View only (no create buttons) |
| `stock-movements` | Movements | Hidden | View ledger | View only |
| `stock-receipts` | Receipts | Hidden | View list | Needed for any receipt changes (also requires draft/post **actions**) |
| `stock-transfers` | Transfers | Hidden | View list | Needed for any transfer changes (also requires draft/post **actions**) |
| `stock-adjustments` | Adjustments | Hidden | View list | Needed for any adjustment changes (also requires draft/post **actions**) |
| `carry-forward-stock` | Opening Stock balances | Hidden | View | Batch-set opening quantities |
| `stock-bin-card` | Bin card (ledger + printable report) | Hidden | View / filter / open report | Same as read unless write on related stock routes |

**Write** on balance or movements does not add create buttons — those tabs are always view-only. Grant **write** on receipts, transfers, or adjustments **plus** the matching action flags below.

### Stock document actions

These boolean actions appear on **Role permissions** next to Validate sales / Validate delivery orders:

| Action | Allows |
|--------|--------|
| Draft stock receipts | New receipt, edit/delete drafts |
| Post stock receipts | Post and cancel posted receipts |
| Draft stock transfers | New transfer, edit/delete drafts (Statistics clerk / supervisors) |
| Post / dispatch stock transfers | Post location moves, dispatch inter-site transfers, cancel posted (Statistics clerk / supervisors) |
| Receive incoming stock transfers | Receive dispatched transfers at destination collection point (Store Keeper and initiators) |
| Draft stock adjustments | New adjustment, edit/delete drafts |
| Post stock adjustments | Post (including reclassify) and cancel posted |
| Post stock receipts directly (skip draft review) | Create and post a new receipt in one step |
| Post stock transfers directly (skip draft review) | Create and finalize a new transfer in one step |

Example: **Statistics clerk** drafts and dispatches transfers company-wide; **Store Keeper** at the destination collection point receives the stock into a storage location. Supervisors and managers can also initiate transfers when needed.

Users with write access to both **Stock** and **Bottled Stock** (for example Statistics clerk) see a unified Stock screen that lists loose and bottled products together. Transfer, receipt, and adjustment documents still contain either loose or bottled lines only—not both on one document. Store Keepers continue to use **Bottled Stock** for bottled products only.

## Role permissions screen

**Role permissions** is admin-only by default. Adjust route and action matrices carefully; incorrect settings can block clerks from selling or allow unauthorized validation.

Next: [Troubleshooting](10-troubleshooting.md).
