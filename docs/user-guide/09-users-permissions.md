# Users and permissions

## Users

**Users** (Users & access) maintains login accounts and role assignment.

## Roles (defaults)

Default route access is defined per role (admins can change the matrix):

| Role | Typical access |
|------|----------------|
| **ADMIN** | All routes write; manage permissions. |
| **MANAGER** | Most routes write (not user admin); validate sales/DOs; can cancel validated DOs. |
| **SENIOR_SALES_SUPERVISOR** | Operations, customers, inventory read/write; can validate sales/DOs. |
| **STATISTICS_SUPERVISOR** | Broad **read** on operations, budgets, inventory, financial/tax screens by default; admins can grant **write** on specific routes. No validate actions by default. |
| **SALES_CLERK** | Sales, DOs, customers, selected reports/stock balance; cannot validate by default. |

## Route access vs actions

- **Route access** — `none` / `read` / `write` per screen (sidebar entry).
- **Actions** (separate toggles):

| Action | Meaning |
|--------|---------|
| `validate_sales` | Validate sales invoices. |
| `validate_delivery_orders` | Validate delivery orders (including the **Validation queue** tab under Delivery Order). |
| `cancel_validated_delivery_order` | Cancel an already validated DO. |
| `manage_permissions` | Edit the permission matrix (**Role permissions**). |

Opening **Sales Invoice** does not by itself allow validation — the action flag must be on. The Delivery Order **Validation queue** tab appears only when `validate_delivery_orders` is granted.

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

**Write** on balance or movements does not add create buttons — those tabs are always view-only. Grant **write** on receipts, transfers, or adjustments **plus** the matching action flags below.

### Stock document actions

These boolean actions appear on **Role permissions** next to Validate sales / Validate delivery orders:

| Action | Allows |
|--------|--------|
| Draft stock receipts | New receipt, edit/delete drafts |
| Post stock receipts | Post and cancel posted receipts |
| Draft stock transfers | New transfer, edit/delete drafts |
| Post / dispatch / receive stock transfers | Post location moves, dispatch, receive, cancel posted |
| Draft stock adjustments | New adjustment, edit/delete drafts |
| Post stock adjustments | Post (including reclassify) and cancel posted |

Example: give a clerk **write** on `stock-receipts` and **Draft stock receipts** only so they can prepare vouchers; grant **Post stock receipts** to supervisors who approve them.

## Role permissions screen

**Role permissions** is admin-only by default. Adjust route and action matrices carefully; incorrect settings can block clerks from selling or allow unauthorized validation.

Next: [Troubleshooting](10-troubleshooting.md).
