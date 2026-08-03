# Domain modules

Key main-process domains and entry files.

## Booklet serial numbers (sales and DOs)

New sales invoices and delivery orders require a **manual booklet serial** entered by the operator (paper booklet). Shared validation lives in `src/shared/bookletSerial.ts` (`validateBookletSerial`): digits only, max 20 characters, non-empty. Services enforce uniqueness and immutability after create (`src/electron/sales/service.ts`, `src/electron/deliveryOrders/service.ts`).

| Kind | Numbering |
|------|-----------|
| New sale / new DO | Operator booklet serial (required) |
| Carry-forward DO | Auto `CF-{year}-{seq}` via `allocateCarryForwardDeliveryOrderNo` in `doNo.ts` |
| Legacy rows | Existing `INV-…` / `DO-…` values remain loadable |

Legacy auto-allocators `allocateDeliveryOrderNo` / `allocateInvoiceNo` in `doNo.ts` / `invoice.ts` are **unused** by create paths; do not wire new UI to them.

## Sales

| Piece | Path |
|-------|------|
| Service | `src/electron/sales/service.ts` |
| Invoice helpers (legacy allocate) | `src/electron/sales/invoice.ts` |
| Print payload | `src/electron/sales/print.ts` |
| DO list/lookup for POS | `src/electron/sales/deliveryOrders.ts` |
| IPC | `src/electron/ipc/sales.ts` |
| UI | `src/ui/sales/SalesClient.tsx`, `SalesScreen.tsx` |

### Pick DO behaviour (current)

- `listAvailableDeliveryOrders({ salesPointId, customerId })` — validated DOs for that pair; **one row per product** with remaining kg; CF flagged via `sourceKind`.
- Sold qty = sum of sale lines on sales with the same `deliveryOrderNo` + product.
- UI one-click: lookup DO → `applyDoLinesFrom(lookup, productId)` loads only that product.
- Manual Lookup + Load lines still loads all remaining products.

Operator description: [Sales invoices](../user-guide/04-sales-invoices.md).

## Delivery orders

| Piece | Path |
|-------|------|
| Service | `src/electron/deliveryOrders/service.ts` |
| DO numbers (CF allocate + unused legacy) | `src/electron/deliveryOrders/doNo.ts` |
| IPC | `src/electron/ipc/deliveryOrders.ts` |
| UI | `src/ui/delivery-orders/` (create, list, validation queue) |

Statuses: `PENDING` | `VALIDATED` | `REJECTED` (as used in types).

### Validation queue

- `listValidationQueue()` — pending DOs awaiting validation.
- `validateMany({ ids })` — bulk validate.
- UI: `src/ui/delivery-orders/validation-queue/ValidationQueueClient.tsx` (tab gated on `validate_delivery_orders`).

## Carry-forward commitments

| Piece | Path |
|-------|------|
| Service | `src/electron/commitments/carryForward.ts` |
| IPC | `src/electron/ipc/carryForward.ts` |

One validated `CARRY_FORWARD` DO per customer + sales point; lines upserted per product. Uses auto CF numbering (not booklet serials).

## Stock

| Piece | Path |
|-------|------|
| Core service / post | `src/electron/stock/service.ts`, `post.ts`, `sales.ts` |
| Carry-forward stock | `src/electron/stock/carryForwardStock.ts` |
| IPC | `src/electron/ipc/stock.ts`, `carryForwardStock.ts` |
| UI | stock screens under `src/ui/` (stock hub, CF stock) |

## Pricing and tax

| Piece | Path |
|-------|------|
| Unit price resolve | `src/electron/pricing/resolveUnitPrice.ts` |
| Tax rates | `src/electron/tax/resolveRates.ts` |

Customer types may set `exemptFromSalesTax` (migration `036`). Sales for those types follow exemption rules; `npm run recalc:sales-tax-exempt` recalculates affected historical sales when needed.

## Financial periods

| Piece | Path |
|-------|------|
| Service | `src/electron/financialYears/service.ts` |
| IPC | `src/electron/ipc/financialYears.ts` |

`getOpenPostingPeriod()` and `resolveReportAsAt()` are shared by posting validation and reports. On startup, `backfillFinancialMonths()` fills missing month rows for open years.

## Dashboard

| Piece | Path |
|-------|------|
| Summary builder | `src/electron/dashboard/summary.ts` |
| IPC | `src/electron/ipc/dashboard.ts` |
| UI | `src/ui/dashboard/` (Overview route) |

Authenticated helper: `getAuthenticatedDashboard()` in the UI auth layer.

## Generic table CRUD

Schema-driven admin tables use `db:*` IPC (`tableQuery`, `tableMutations`, `tableMeta`) for list/edit UIs that are not custom domain screens.
