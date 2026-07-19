# Auth and permissions

## Auth flow

- Handlers: [`src/electron/ipc/auth.ts`](../../src/electron/ipc/auth.ts)
- Session helpers: [`src/electron/auth/session.ts`](../../src/electron/auth/session.ts)
- Password hashing: [`src/electron/auth/password.ts`](../../src/electron/auth/password.ts)
- `requireAuthUser(token)` guards IPC that needs a logged-in user

Login returns a token; the renderer stores it and passes it into authenticated API wrappers.

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
| `validate_delivery_orders` | Validate DOs |
| `cancel_validated_delivery_order` | Cancel validated DO |
| `manage_permissions` | Edit matrix |

UI screens check route access for navigation; mutation handlers should also enforce actions where relevant.

## Role permissions UI

Route `role-permissions` — ADMIN write by default. Matrix load/save via `permissions:*` IPC.

## Adding a screen

1. Add route id to `routeCatalog` (and sidebar/`schemaRoutes` if shown).
2. Ensure default matrices / seed migration grant access to intended roles.
3. Wire `HomeScreen` to the component.
4. Protect IPC with auth (+ action checks if needed).
