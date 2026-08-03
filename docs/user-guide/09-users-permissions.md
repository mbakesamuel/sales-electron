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
| **STATISTICS_SUPERVISOR** | Broad **read** on operations, budgets, inventory reports, financial/tax screens; no validate actions by default. |
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

## Role permissions screen

**Role permissions** is admin-only by default. Adjust route and action matrices carefully; incorrect settings can block clerks from selling or allow unauthorized validation.

Next: [Troubleshooting](10-troubleshooting.md).
