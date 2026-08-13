# Auth and permissions

## Auth flow

- Handlers: [`src/electron/ipc/auth.ts`](../../src/electron/ipc/auth.ts)
- Session helpers: [`src/electron/auth/session.ts`](../../src/electron/auth/session.ts)
- Password hashing: [`src/electron/auth/password.ts`](../../src/electron/auth/password.ts)
- `requireAuthUser(token)` guards IPC that needs a logged-in user

Login returns a token; the renderer stores it and passes it into authenticated API wrappers.

### First-login password change

- `User.mustChangePassword` is set to `1` whenever an admin creates a user or resets their password (see `applyUserPassword` in [`tableMutations.ts`](../../src/electron/db/tableMutations.ts)).
- Login / `getSession` include `mustChangePassword` on `AuthUser`.
- The renderer gates on that flag and shows [`ChangePasswordScreen`](../../src/ui/pages/ChangePasswordScreen.tsx) instead of home.
- `auth:changePassword` verifies the current password, stores a new hash, and clears the flag.

## Permission model

Types: [`src/shared/permissions.types.ts`](../../src/shared/permissions.types.ts)

### Route access

Per role × route id: `none` | `read` | `write`.  
Route ids come from [`src/shared/routeCatalog.ts`](../../src/shared/routeCatalog.ts).

Defaults: [`src/electron/auth/permissions/defaults.ts`](../../src/electron/auth/permissions/defaults.ts).

### Actions

| Key | Use |
|-----|-----|
| `validate_sales` | Validate invoices |
| `validate_delivery_orders` | Validate DOs (including Validation queue bulk validate) |
| `cancel_validated_delivery_order` | Cancel validated DO |
| `transfer_delivery_order_balance` | Transfer remaining DO balance to another sales point |
| `manage_permissions` | Edit matrix |
| `draft_stock_receipts` | Create / edit / delete draft receipts |
| `post_stock_receipts` | Post receipts and cancel posted receipts |
| `draft_stock_transfers` | Create / edit / delete draft transfers |
| `post_stock_transfers` | Dispatch, post location moves, receive, cancel posted transfers |
| `draft_stock_adjustments` | Create / edit / delete draft adjustments |
| `post_stock_adjustments` | Post adjustments (including reclassify) and cancel posted adjustments |

UI screens check route access for navigation; mutation handlers should also enforce actions where relevant. New report routes need route-permission seeds so roles can open them — recent examples: `monthly-palm-oil-sales-report`, `revenue-taxes-report`, `industry-product-monthly-sales-report`, `bottled-palm-oil-sales-return-report`, `other-product-sales-deliveries-report`, `stock-bin-card` / `stock-bin-card-report` (migrations `046`–`051`). DO tracking and transfer routes: `delivery-order-tracking`, `delivery-order-transfer` (`044`–`045`).

Stock document buttons require route **write** on `stock-receipts` / `stock-transfers` / `stock-adjustments` **and** the matching draft or post action (see `getStockBootstrap` in [`src/electron/stock/service.ts`](../../src/electron/stock/service.ts)).

## Role permissions UI

Route `role-permissions` — ADMIN write by default. Matrix load/save via `permissions:*` IPC.

## Adding a screen

1. Add route id to `routeCatalog` (and sidebar/`schemaRoutes` if shown).
2. Ensure default matrices / seed migration grant access to intended roles.
3. Wire `HomeScreen` to the component.
4. Protect IPC with auth (+ action checks if needed).
